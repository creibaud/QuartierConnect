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

    @Prop({ required: false, default: "" })
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
// Backs the neighborhood-scoped listing and its default createdAt sort.
EventSchema.index({ neighborhoodId: 1, createdAt: -1 });
