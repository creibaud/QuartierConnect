import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ServiceResponseDocument = HydratedDocument<ServiceResponse>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ServiceResponse {
    @Prop({ type: Types.ObjectId, ref: "Service", required: true, index: true })
    serviceId: Types.ObjectId;

    @Prop({ required: true, index: true })
    responderId: string;

    // Managed by `timestamps: { createdAt: true }`; declared for type inference on .lean().
    createdAt: Date;
}

export const ServiceResponseSchema =
    SchemaFactory.createForClass(ServiceResponse);
ServiceResponseSchema.index({ serviceId: 1, responderId: 1 }, { unique: true });
