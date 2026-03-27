import { Module } from "@nestjs/common";
import { EventsController } from "src/modules/events/events.controller";
import { EventsService } from "src/modules/events/events.service";

@Module({
    controllers: [EventsController],
    providers: [EventsService],
    exports: [EventsService],
})
export class EventsModule {}
