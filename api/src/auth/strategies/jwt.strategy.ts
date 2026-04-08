import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ExtractJwt, Strategy } from "passport-jwt";
import { DRIZZLE_TOKEN } from "../../database/drizzle.module";
import * as schema from "../../database/schema";
import { JwtPayload } from "../token.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {
        const secret = configService.get<string>("JWT_SECRET");
        if (!secret) throw new Error("JWT_SECRET env var is required");
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: JwtPayload) {
        if (!payload?.sub) {
            throw new UnauthorizedException({ code: "TOKEN_INVALID" });
        }

        const [user] = await this.db
            .select({ role: schema.users.role })
            .from(schema.users)
            .where(eq(schema.users.id, payload.sub))
            .limit(1);

        if (!user) {
            throw new UnauthorizedException({ code: "TOKEN_INVALID" });
        }

        if (user.role === "banned" || user.role === "deleted") {
            throw new UnauthorizedException({ code: "ACCOUNT_BANNED" });
        }

        return { sub: payload.sub, email: payload.email, role: user.role };
    }
}
