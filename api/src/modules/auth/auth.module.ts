import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { DrizzleModule } from "src/database/drizzle/drizzle.module";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { AuthController } from "src/modules/auth/auth.controller";
import {
    AuthRepository,
    type IAuthRepository,
} from "src/modules/auth/auth.repository";
import { AuthService } from "src/modules/auth/auth.service";
import {
    JwtExpiresIn,
    JwtStrategy,
} from "src/modules/auth/strategies/jwt.strategy";
import { TotpService } from "src/modules/auth/totp.service";

@Module({
    imports: [
        DrizzleModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
                signOptions: {
                    expiresIn: configService.getOrThrow<JwtExpiresIn>(
                        "JWT_ACCESS_EXPIRATION",
                        "15m",
                    ),
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        {
            provide: "IAuthRepository",
            useFactory: (db: DrizzleDB): IAuthRepository =>
                new AuthRepository(db),
            inject: ["DRIZZLE"],
        },
        AuthService,
        JwtStrategy,
        TotpService,
    ],
    exports: [AuthService],
})
export class AuthModule {}
