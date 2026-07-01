import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { ContractsModule } from "../contracts/contracts.module";
import { PointsModule } from "../points/points.module";
import { Service, ServiceSchema } from "../services/schemas/service.schema";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import {
    ServiceBooking,
    ServiceBookingSchema,
} from "./schemas/service-booking.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ServiceBooking.name, schema: ServiceBookingSchema },
            { name: Service.name, schema: ServiceSchema },
        ]),
        AuthModule,
        ContractsModule,
        PointsModule,
    ],
    controllers: [BookingsController],
    providers: [BookingsService],
})
export class BookingsModule {}
