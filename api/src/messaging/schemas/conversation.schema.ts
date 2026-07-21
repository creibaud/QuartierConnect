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

    /** Sorted, joined participant ids. Set on direct threads only; its unique
     * index keeps a pair to a single thread even under concurrent creates. */
    @Prop({ type: String })
    participantKey?: string;

    @Prop({ type: String, default: null })
    groupName: string | null;

    @Prop({ type: Date, default: null })
    lastMessageAt: Date | null;

    /** Per-participant read marker, keyed by user id. Absent means never opened. */
    @Prop({ type: Map, of: Date, default: () => new Map<string, Date>() })
    lastReadAt: Map<string, Date>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ participants: 1 });
// Group threads carry no key, so the partial filter leaves them out.
ConversationSchema.index(
    { participantKey: 1 },
    {
        unique: true,
        partialFilterExpression: { participantKey: { $exists: true } },
    },
);
