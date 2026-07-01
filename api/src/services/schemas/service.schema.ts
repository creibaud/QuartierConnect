import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import {
    GeoPoint,
    GeoPointSchema,
} from "../../common/schemas/geo-point.schema";

export type ServiceDocument = HydratedDocument<Service>;

@Schema({ timestamps: true })
export class Service {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    category: string;

    @Prop({ required: true, enum: ["free", "paid", "exchange"] })
    type: string;

    @Prop({ required: true })
    createdBy: string;

    @Prop()
    neighborhoodId: string;

    @Prop({ default: 1.0, min: 0.1, max: 10.0 })
    pointsMultiplier: number;

    @Prop({ type: GeoPointSchema, required: false })
    location?: GeoPoint;

    @Prop({ required: true, enum: ["offer", "request"], default: "offer" })
    direction: string;

    @Prop()
    address?: string;

    @Prop({ min: 1 })
    duration?: number;

    @Prop({ required: true, enum: ["active", "closed"], default: "active" })
    status: string;

    @Prop({ min: 0 })
    pointsAmount?: number;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
ServiceSchema.index({ location: "2dsphere" }, { sparse: true });
