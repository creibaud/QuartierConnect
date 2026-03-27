import { Module } from "@nestjs/common";
import { MessagesController } from "src/modules/messages/messages.controller";
import { MessagesGateway } from "src/modules/messages/messages.gateway";
import { MessagesService } from "src/modules/messages/messages.service";

@Module({
    controllers: [MessagesController],
    providers: [MessagesGateway, MessagesService],
    exports: [MessagesService],
})
export class MessagesModule {}
