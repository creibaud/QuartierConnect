import { Module } from "@nestjs/common";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { EventRegistrationService } from "src/modules/events/event-registration.service";
import { EventSwipeService } from "src/modules/events/event-swipe.service";
import {
    EventRepository,
    type IEventsRepository,
} from "src/modules/events/event.repository";
import { EventsController } from "src/modules/events/events.controller";
import { EventsService } from "src/modules/events/events.service";

@Module({
    controllers: [EventsController],
    providers: [
        {
            provide: "IEventsRepository",
            useFactory: (mongo: MongoDatabase) => new EventRepository(mongo),
            inject: ["MONGODB"],
        },
        EventsService,
        EventRegistrationService,
        EventSwipeService,
    ],
    exports: [EventsService, EventRegistrationService, EventSwipeService],
})
export class EventsModule {}
