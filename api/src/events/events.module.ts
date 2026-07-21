import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { GeocodingModule } from "../geocoding/geocoding.module";
import { SocialModule } from "../social/social.module";
import { Vote, VoteSchema } from "../votes/schemas/vote.schema";
import { EventsController } from "./events.controller";
import { Event, EventSchema } from "./schemas/event.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Event.name, schema: EventSchema },
            { name: Vote.name, schema: VoteSchema },
        ]),
        AuthModule,
        GeocodingModule,
        SocialModule,
    ],
    controllers: [EventsController],
})
export class EventsModule {}
