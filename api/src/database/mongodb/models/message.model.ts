import type { ObjectId } from "mongodb";

export const MESSAGES_COLLECTION = "messages";

export type MessageAttachment = {
    fileId: ObjectId;
    filename: string;
    contentType: string;
    size: number;
};

export type MessageDocument = {
    _id?: ObjectId;
    chatId: string;
    authorUserId: string;
    content: string;
    attachments: MessageAttachment[];
    createdAt: Date;
    updatedAt: Date;
};
