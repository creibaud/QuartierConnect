import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import {
    GeoPoint,
    GeoPointSchema,
} from "../../common/schemas/geo-point.schema";

export type EventDocument = HydratedDocument<Event>;

@Schema({ timestamps: true })
export class Event {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    category: string;

    @Prop({ required: true })
    date: Date;

    @Prop({ required: true })
    createdBy: string;

    @Prop()
    neighborhoodId: string;

    @Prop({ type: [String], default: [] })
    interestedUserIds: string[];

    @Prop()
    address?: string;

    @Prop({ type: GeoPointSchema, required: false })
    location?: GeoPoint;
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ location: "2dsphere" }, { sparse: true });
