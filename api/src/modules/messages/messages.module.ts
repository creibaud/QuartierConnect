import { Module } from "@nestjs/common";
import { MongodbModule } from "src/database/mongodb/mongodb.module";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import {
    MessagesRepository,
    type IMessagesRepository,
} from "src/modules/messages/message.repository";
import { MessagesController } from "src/modules/messages/messages.controller";
import { MessagesGateway } from "src/modules/messages/messages.gateway";
import { MessagesService } from "src/modules/messages/messages.service";

@Module({
    imports: [MongodbModule],
    controllers: [MessagesController],
    providers: [
        {
            provide: "IMessagesRepository",
            useFactory: (mongo: MongoDatabase): IMessagesRepository =>
                new MessagesRepository(mongo),
            inject: ["MONGODB"],
        },
        MessagesGateway,
        MessagesService,
    ],
    exports: [MessagesService],
})
export class MessagesModule {}
