import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { DrizzleModule } from "../database/drizzle.module";
import { MessagingController } from "./messaging.controller";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";
import { NotificationsListener } from "./notifications.listener";
import {
    Conversation,
    ConversationSchema,
} from "./schemas/conversation.schema";
import { Message, MessageSchema } from "./schemas/message.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Conversation.name, schema: ConversationSchema },
            { name: Message.name, schema: MessageSchema },
        ]),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const secret = config.get<string>("JWT_SECRET");
                if (!secret) throw new Error("JWT_SECRET env var is required");
                return { secret, signOptions: { expiresIn: "15m" } };
            },
        }),
        AuthModule,
        DrizzleModule,
    ],
    controllers: [MessagingController],
    providers: [MessagingService, MessagingGateway, NotificationsListener],
    exports: [MessagingService],
})
export class MessagingModule {}
