import { randomUUID } from "crypto";
import {
    ConflictException,
    Inject,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Model } from "mongoose";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { SocialService } from "../social/social.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import {
    SsoSurface,
    SsoToken,
    SsoTokenDocument,
} from "./schemas/sso-token.schema";
import { TokenPair, TokenService } from "./token.service";
import { TotpService } from "./totp.service";

const SSO_TTL_SECONDS = 300;

@Injectable()
export class AuthService {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        @InjectModel(SsoToken.name)
        private readonly ssoTokenModel: Model<SsoTokenDocument>,
        private readonly totpService: TotpService,
        private readonly tokenService: TokenService,
        private readonly socialService: SocialService,
    ) {}

    async register(dto: RegisterDto): Promise<{ otpauthUrl: string }> {
        const passwordHash = await argon2.hash(dto.password);
        const { secret, otpauthUrl } = this.totpService.generateSecret(
            dto.email,
        );

        let insertedId: string | undefined;
        try {
            const [inserted] = await this.db
                .insert(schema.users)
                .values({
                    email: dto.email.toLowerCase(),
                    passwordHash,
                    totpSecret: secret,
                })
                .returning({ id: schema.users.id });
            insertedId = inserted?.id;
        } catch (error: unknown) {
            const pg = error as { code?: string; cause?: { code?: string } };
            const pgCode = pg.code ?? pg.cause?.code;
            if (pgCode === "23505") {
                throw new ConflictException({
                    code: "EMAIL_ALREADY_EXISTS",
                    message: "Email already registered",
                });
            }
            throw error;
        }

        if (insertedId) {
            void this.socialService.syncUser(insertedId);
        }

        return { otpauthUrl };
    }

    async login(dto: LoginDto): Promise<TokenPair & { user: object }> {
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, dto.email.toLowerCase()));

        if (!user) {
            throw new UnauthorizedException({
                code: "INVALID_PASSWORD",
                message: "Invalid credentials",
            });
        }

        if (user.role === "banned") {
            throw new UnauthorizedException({
                code: "ACCOUNT_BANNED",
                message: "Account has been banned",
            });
        }

        const passwordValid = await argon2.verify(
            user.passwordHash,
            dto.password,
        );
        if (!passwordValid) {
            throw new UnauthorizedException({
                code: "INVALID_PASSWORD",
                message: "Invalid credentials",
            });
        }

        const totpValid = this.totpService.verify(
            user.totpSecret,
            dto.totpCode,
        );
        if (!totpValid) {
            throw new UnauthorizedException({
                code: "INVALID_TOTP",
                message: "Invalid TOTP code",
            });
        }

        const tokens = await this.tokenService.generatePair({
            sub: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            ...tokens,
            user: { id: user.id, email: user.email, role: user.role },
        };
    }

    async generateSsoToken(
        userId: string,
        surface: SsoSurface,
        state?: string,
    ): Promise<{
        ssoToken: string;
        expiresAt: string;
        expiresIn: number;
    }> {
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + SSO_TTL_SECONDS * 1000);

        await this.ssoTokenModel.create({
            userId,
            token,
            surface,
            state: state ?? null,
            expiresAt,
        });

        return {
            ssoToken: token,
            expiresAt: expiresAt.toISOString(),
            expiresIn: SSO_TTL_SECONDS,
        };
    }

    async exchangeSsoToken(
        ssoToken: string,
        state?: string,
    ): Promise<TokenPair & { user: object }> {
        const record = await this.ssoTokenModel.findOneAndUpdate(
            {
                token: ssoToken,
                usedAt: null,
                expiresAt: { $gt: new Date() },
            },
            { usedAt: new Date() },
            { returnDocument: "after" },
        );

        if (!record) {
            throw new UnauthorizedException({
                code: "SSO_INVALID",
                message: "Invalid, expired or already used SSO token",
            });
        }

        if (record.state !== null && record.state !== state) {
            throw new UnauthorizedException({
                code: "SSO_STATE_MISMATCH",
                message: "State parameter does not match",
            });
        }

        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, record.userId));

        if (!user) {
            throw new UnauthorizedException({
                code: "SSO_INVALID",
                message: "User not found",
            });
        }

        const tokens = await this.tokenService.generatePair({
            sub: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            ...tokens,
            user: { id: user.id, email: user.email, role: user.role },
        };
    }

    async refresh(refreshToken: string): Promise<TokenPair> {
        return this.tokenService.rotateRefreshToken(refreshToken);
    }

    async logout(userId: string): Promise<{ success: boolean }> {
        await this.tokenService.revokeRefreshToken(userId);
        return { success: true };
    }
}
