import { randomUUID } from "crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { and, eq, gt, lt } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    jti?: string;
    exp?: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class TokenService {
    constructor(
        private readonly jwtService: JwtService,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    async generatePair(payload: JwtPayload): Promise<TokenPair> {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { ...payload, jti: randomUUID() },
                { expiresIn: "15m" },
            ),
            this.jwtService.signAsync(
                { ...payload, jti: randomUUID() },
                { expiresIn: "7d" },
            ),
        ]);

        const refreshTokenHash = await argon2.hash(refreshToken);
        await this.db
            .update(schema.users)
            .set({ refreshTokenHash })
            .where(eq(schema.users.id, payload.sub));

        return { accessToken, refreshToken };
    }

    async rotateRefreshToken(refreshToken: string): Promise<TokenPair> {
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify<JwtPayload>(refreshToken);
        } catch {
            throw new UnauthorizedException({ code: "TOKEN_INVALID" });
        }

        const verified = await this.db.transaction(async (tx) => {
            const [user] = await tx
                .select()
                .from(schema.users)
                .where(eq(schema.users.id, payload.sub))
                .for("update");

            if (!user?.refreshTokenHash) {
                throw new UnauthorizedException({ code: "TOKEN_REVOKED" });
            }

            if (user.role === "banned") {
                throw new UnauthorizedException({ code: "ACCOUNT_BANNED" });
            }

            const isValid = await argon2.verify(
                user.refreshTokenHash,
                refreshToken,
            );
            if (!isValid) {
                throw new UnauthorizedException({ code: "TOKEN_REVOKED" });
            }

            await tx
                .update(schema.users)
                .set({ refreshTokenHash: null })
                .where(eq(schema.users.id, payload.sub));

            return {
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
            };
        });

        return this.generatePair({
            sub: payload.sub,
            email: payload.email,
            role: verified.role,
            firstName: verified.firstName,
            lastName: verified.lastName,
        });
    }

    async revokeRefreshToken(userId: string): Promise<void> {
        await this.db
            .update(schema.users)
            .set({ refreshTokenHash: null })
            .where(eq(schema.users.id, userId));
    }

    async revokeAccessToken(jti: string, expiresAt: Date): Promise<void> {
        await Promise.all([
            this.db
                .insert(schema.revokedTokens)
                .values({ jti, expiresAt })
                .onConflictDoNothing(),
            this.db
                .delete(schema.revokedTokens)
                .where(lt(schema.revokedTokens.expiresAt, new Date())),
        ]);
    }

    async isAccessTokenRevoked(jti: string): Promise<boolean> {
        const [revoked] = await this.db
            .select({ jti: schema.revokedTokens.jti })
            .from(schema.revokedTokens)
            .where(
                and(
                    eq(schema.revokedTokens.jti, jti),
                    gt(schema.revokedTokens.expiresAt, new Date()),
                ),
            )
            .limit(1);
        return !!revoked;
    }
}
