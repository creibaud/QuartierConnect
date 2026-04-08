import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
    @Prop({ type: [String], required: true })
    participants: string[];

    @Prop({ type: String, default: null })
    neighborhoodId: string | null;

    @Prop({ default: false })
    isGroup: boolean;

    @Prop({ type: String, default: null })
    groupName: string | null;

    @Prop({ type: Date, default: null })
    lastMessageAt: Date | null;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ participants: 1 });
