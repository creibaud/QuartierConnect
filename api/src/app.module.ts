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
import { AdminModule } from "src/modules/admin/admin.module";
import { AuthModule } from "src/modules/auth/auth.module";
import { DocumentsModule } from "src/modules/documents/documents.module";
import { EventsModule } from "src/modules/events/events.module";
import { HealthModule } from "src/modules/health/health.module";
import { IncidentsModule } from "src/modules/incidents/incidents.module";
import { MessagesModule } from "src/modules/messages/messages.module";
import { OutboxModule } from "src/modules/outbox/outbox.module";
import { QuartiersModule } from "src/modules/quartiers/quartiers.module";
import { RecommendationsModule } from "src/modules/recommendations/recommendations.module";
import { ServicesModule } from "src/modules/services/services.module";
import { SyncModule } from "src/modules/sync/sync.module";
import { TransactionsModule } from "src/modules/transactions/transactions.module";
import { UsersModule } from "src/modules/users/users.module";
import { VotesModule } from "src/modules/votes/votes.module";

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
        OutboxModule,
        AuthModule,
        HealthModule,
        UsersModule,
        QuartiersModule,
        IncidentsModule,
        EventsModule,
        ServicesModule,
        TransactionsModule,
        VotesModule,
        MessagesModule,
        DocumentsModule,
        RecommendationsModule,
        AdminModule,
        SyncModule,
    ],
    providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
    ],
})
export class AppModule {}
