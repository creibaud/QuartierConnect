import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

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
}

export const EventSchema = SchemaFactory.createForClass(Event);
