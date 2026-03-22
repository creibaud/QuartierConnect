import { MailerModule } from "@nestjs-modules/mailer";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { validateEnv } from "src/config/env.validation";
import { DrizzleModule } from "src/database/drizzle/drizzle.module";
import { MongodbModule } from "src/database/mongodb/mongodb.module";
import { Neo4jModule } from "src/database/neo4j/neo4j.module";
import { AuthModule } from "src/modules/auth/auth.module";
import { HealthModule } from "src/modules/health/health.module";
import { UsersModule } from "src/modules/users/users.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ".env",
            validate: validateEnv,
        }),
        MailerModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                transport: {
                    host: configService.getOrThrow<string>("MAIL_HOST"),
                    port: configService.getOrThrow<number>("MAIL_PORT"),
                    auth: {
                        user: configService.getOrThrow<string>("MAIL_USER"),
                        pass: configService.getOrThrow<string>("MAIL_PASS"),
                    },
                },
                defaults: {
                    from: `"QuartierConnect" <${configService.getOrThrow<string>(
                        "MAIL_FROM",
                    )}>`,
                },
            }),
            inject: [ConfigService],
        }),
        DrizzleModule,
        MongodbModule,
        Neo4jModule,
        AuthModule,
        HealthModule,
        UsersModule,
    ],
    providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
    ],
})
export class AppModule {}
