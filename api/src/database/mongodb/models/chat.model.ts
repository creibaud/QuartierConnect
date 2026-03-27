import type { ObjectId } from "mongodb";

export const CHATS_COLLECTION = "chats";

export type ChatDocument = {
    _id?: ObjectId;
    participantIds: string[];
    name?: string;
    lastMessageAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};
