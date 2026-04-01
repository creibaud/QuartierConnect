import type { ObjectId } from "mongodb";

export const MESSAGES_COLLECTION = "messages";

export type MessageAttachment = {
    fileId: ObjectId;
    filename: string;
    contentType: string;
    size: number;
};

export type MessageReport = {
    reportedBy: string;
    reason?: string;
    reportedAt: Date;
};

export const REPORT_AUTO_DELETE_THRESHOLD = 5;

export type MessageDocument = {
    _id?: ObjectId;
    chatId: string;
    authorUserId: string;
    content: string;
    attachments: MessageAttachment[];
    reports?: MessageReport[];
    createdAt: Date;
    updatedAt: Date;
};
