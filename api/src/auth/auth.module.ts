import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import { SocialModule } from "../social/social.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { SsoToken, SsoTokenSchema } from "./schemas/sso-token.schema";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { TokenService } from "./token.service";
import { TotpService } from "./totp.service";

@Module({
    imports: [
        PassportModule,
        SocialModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const secret = config.get<string>("JWT_SECRET");
                if (!secret) throw new Error("JWT_SECRET env var is required");
                return { secret, signOptions: { expiresIn: "15m" } };
            },
        }),
        MongooseModule.forFeature([
            { name: SsoToken.name, schema: SsoTokenSchema },
        ]),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        TokenService,
        TotpService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
    ],
    exports: [JwtAuthGuard, RolesGuard, TokenService, TotpService],
})
export class AuthModule {}
