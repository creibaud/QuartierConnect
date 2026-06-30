import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { GeocodingModule } from "../geocoding/geocoding.module";
import { SocialModule } from "../social/social.module";
import { EventsController } from "./events.controller";
import { Event, EventSchema } from "./schemas/event.schema";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
        AuthModule,
        GeocodingModule,
        SocialModule,
    ],
    controllers: [EventsController],
})
export class EventsModule {}
