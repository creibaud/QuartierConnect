import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ServiceDocument = HydratedDocument<Service>;

@Schema({ _id: false })
export class GeoPoint {
    @Prop({ type: String, enum: ["Point"], default: "Point" })
    type: "Point";

    @Prop({ type: [Number], required: true })
    coordinates: [number, number];
}

export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

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
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
ServiceSchema.index({ location: "2dsphere" }, { sparse: true });
