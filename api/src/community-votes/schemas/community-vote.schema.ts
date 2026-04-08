import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type CommunityVoteDocument = HydratedDocument<CommunityVote>;

export enum CommunityVoteType {
    BINARY = "binary",
    SINGLE_CHOICE = "single_choice",
    MULTIPLE_CHOICE = "multiple_choice",
    WEIGHTED = "weighted",
}

export interface VoteOption {
    id: string;
    label: string;
}

export interface CastRecord {
    userId: string;
    choices: string[];
    weights?: Record<string, number>;
    castAt: Date;
}

@Schema({ timestamps: true })
export class CommunityVote {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true, enum: CommunityVoteType })
    voteType: CommunityVoteType;

    @Prop({ type: [{ id: String, label: String }], default: [] })
    options: VoteOption[];

    @Prop({ required: true })
    createdBy: string;

    @Prop({ required: true })
    endsAt: Date;

    @Prop({ default: false })
    isAnonymous: boolean;

    @Prop({ default: 0, min: 0, max: 100 })
    quorum: number;

    @Prop({
        type: [
            {
                userId: { type: String, required: true },
                choices: { type: [String], required: true },
                weights: { type: Map, of: Number },
                castAt: { type: Date, required: true },
            },
        ],
        default: [],
    })
    casts: CastRecord[];

    @Prop({ default: "open", enum: ["open", "closed"] })
    status: string;
}

export const CommunityVoteSchema = SchemaFactory.createForClass(CommunityVote);
