import * as path from "path";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AcceptLanguageResolver, I18nModule, QueryResolver } from "nestjs-i18n";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { CommunityVotesModule } from "./community-votes/community-votes.module";
import { ContractsModule } from "./contracts/contracts.module";
import { DrizzleModule } from "./database/drizzle.module";
import { DocumentsModule } from "./documents/documents.module";
import { DslModule } from "./dsl/dsl.module";
import { EventsModule } from "./events/events.module";
import { IncidentsModule } from "./incidents/incidents.module";
import { MessagingModule } from "./messaging/messaging.module";
import { NeighborhoodsModule } from "./neighborhoods/neighborhoods.module";
import { PointsModule } from "./points/points.module";
import { ServicesModule } from "./services/services.module";
import { SocialModule } from "./social/social.module";
import { UsersModule } from "./users/users.module";
import { VotesModule } from "./votes/votes.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [".env", "../.env"],
        }),
        EventEmitterModule.forRoot(),
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                uri: config.get<string>(
                    "MONGO_URI",
                    "mongodb://localhost:27017/quartierconnect",
                ),
            }),
        }),
        ThrottlerModule.forRoot([{ ttl: 900000, limit: 100 }]),
        I18nModule.forRoot({
            fallbackLanguage: "fr",
            loaderOptions: {
                path: path.join(__dirname, "/i18n/"),
                watch: true,
            },
            resolvers: [
                { use: QueryResolver, options: ["lang"] },
                AcceptLanguageResolver,
            ],
        }),
        DrizzleModule,
        AuthModule,
        NeighborhoodsModule,
        ServicesModule,
        IncidentsModule,
        EventsModule,
        PointsModule,
        UsersModule,
        SocialModule,
        ContractsModule,
        MessagingModule,
        VotesModule,
        DocumentsModule,
        DslModule,
        CommunityVotesModule,
    ],
    controllers: [AppController],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
