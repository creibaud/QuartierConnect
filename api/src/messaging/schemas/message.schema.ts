import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type MessageDocument = Message & Document;

export enum MessageType {
    TEXT = "text",
    FILE = "file",
    IMAGE = "image",
}

@Schema({ timestamps: true })
export class Message {
    @Prop({ required: true })
    conversationId: string;

    @Prop({ required: true })
    senderId: string;

    @Prop({ required: true, enum: MessageType, default: MessageType.TEXT })
    type: MessageType;

    @Prop({ type: String, default: null })
    content: string | null;

    @Prop({ type: String, default: null })
    fileId: string | null;

    @Prop({ type: String, default: null })
    fileName: string | null;

    @Prop({ type: Boolean, default: false })
    deleted: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, createdAt: -1 });
