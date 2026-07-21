import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import {
    ServiceBooking,
    ServiceBookingSchema,
} from "../bookings/schemas/service-booking.schema";
import { GeocodingModule } from "../geocoding/geocoding.module";
import { SocialModule } from "../social/social.module";
import { Vote, VoteSchema } from "../votes/schemas/vote.schema";
import {
    ServiceResponse,
    ServiceResponseSchema,
} from "./schemas/service-response.schema";
import { Service, ServiceSchema } from "./schemas/service.schema";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Service.name, schema: ServiceSchema },
            { name: ServiceResponse.name, schema: ServiceResponseSchema },
            { name: ServiceBooking.name, schema: ServiceBookingSchema },
            { name: Vote.name, schema: VoteSchema },
        ]),
        AuthModule,
        GeocodingModule,
        SocialModule,
    ],
    controllers: [ServicesController],
    providers: [ServicesService],
    exports: [ServicesService],
})
export class ServicesModule {}
