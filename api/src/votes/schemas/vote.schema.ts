import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type VoteDocument = Vote & Document;

export enum VoteType {
    LIKE = "like",
    DISLIKE = "dislike",
    UP = "up",
    DOWN = "down",
}

export enum VoteTargetType {
    INCIDENT = "incident",
    SERVICE = "service",
    EVENT = "event",
    COMMENT = "comment",
}

@Schema({ timestamps: true })
export class Vote {
    @Prop({ required: true })
    userId: string;

    @Prop({ required: true })
    targetId: string;

    @Prop({ required: true, enum: VoteTargetType })
    targetType: VoteTargetType;

    @Prop({ required: true, enum: VoteType })
    voteType: VoteType;
}

export const VoteSchema = SchemaFactory.createForClass(Vote);
VoteSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
