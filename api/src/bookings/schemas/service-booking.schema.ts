import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ServiceBookingDocument = HydratedDocument<ServiceBooking>;

export enum BookingStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    DECLINED = "declined",
    CANCELLED = "cancelled",
    COMPLETED = "completed",
}

@Schema({ timestamps: true })
export class ServiceBooking {
    @Prop({ type: Types.ObjectId, ref: "Service", required: true, index: true })
    serviceId: Types.ObjectId;

    @Prop({ required: true, index: true })
    initiatorId: string;

    @Prop({ required: true })
    payerId: string;

    @Prop({ required: true })
    payeeId: string;

    @Prop({ required: true })
    pointsAmount: number;

    @Prop({
        required: true,
        enum: BookingStatus,
        default: BookingStatus.PENDING,
    })
    status: BookingStatus;

    @Prop({ type: String, default: null })
    contractId: string | null;
}

export const ServiceBookingSchema =
    SchemaFactory.createForClass(ServiceBooking);
ServiceBookingSchema.index({ serviceId: 1, initiatorId: 1, status: 1 });
