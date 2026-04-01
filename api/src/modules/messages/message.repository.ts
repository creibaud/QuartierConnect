import { ObjectId, type Collection } from "mongodb";
import {
    CHATS_COLLECTION,
    type ChatDocument,
} from "src/database/mongodb/models/chat.model";
import {
    MESSAGES_COLLECTION,
    type MessageDocument,
    type MessageReport,
} from "src/database/mongodb/models/message.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

export interface IMessagesRepository {
    findUserChats(userId: string): Promise<ChatDocument[]>;
    findDirectChat(participantIds: string[]): Promise<ChatDocument | null>;
    createChat(doc: Omit<ChatDocument, "_id">): Promise<ObjectId>;
    findChatById(id: string): Promise<ChatDocument | null>;
    updateChatLastMessageAt(chatId: string, at: Date): Promise<void>;
    createMessage(doc: MessageDocument): Promise<ObjectId>;
    findMessages(
        chatId: string,
        before: string | undefined,
        skip: number,
        limit: number,
    ): Promise<MessageDocument[]>;
    countMessages(chatId: string, before: string | undefined): Promise<number>;
    findMessageById(id: string): Promise<MessageDocument | null>;
    findMessageInChat(
        messageId: string,
        chatId: string,
    ): Promise<MessageDocument | null>;
    pushMessageReport(
        messageId: string,
        report: MessageReport,
    ): Promise<void>;
    deleteMessage(id: string): Promise<void>;
}

export class MessagesRepository implements IMessagesRepository {
    private readonly chats: Collection<ChatDocument>;
    private readonly messages: Collection<MessageDocument>;

    constructor(mongo: MongoDatabase) {
        this.chats = mongo.collection<ChatDocument>(CHATS_COLLECTION);
        this.messages = mongo.collection<MessageDocument>(MESSAGES_COLLECTION);
    }

    async findUserChats(userId: string): Promise<ChatDocument[]> {
        return this.chats
            .find({ participantIds: userId })
            .sort({ lastMessageAt: -1 })
            .toArray();
    }

    async findDirectChat(
        participantIds: string[],
    ): Promise<ChatDocument | null> {
        return this.chats.findOne({
            participantIds: { $all: participantIds, $size: 2 },
        });
    }

    async createChat(doc: Omit<ChatDocument, "_id">): Promise<ObjectId> {
        const result = await this.chats.insertOne(doc as ChatDocument);
        return result.insertedId;
    }

    async findChatById(id: string): Promise<ChatDocument | null> {
        return this.chats.findOne({ _id: new ObjectId(id) });
    }

    async updateChatLastMessageAt(chatId: string, at: Date): Promise<void> {
        await this.chats.updateOne(
            { _id: new ObjectId(chatId) },
            { $set: { lastMessageAt: at, updatedAt: at } },
        );
    }

    async createMessage(doc: MessageDocument): Promise<ObjectId> {
        const result = await this.messages.insertOne(doc);
        return result.insertedId;
    }

    async findMessages(
        chatId: string,
        before: string | undefined,
        skip: number,
        limit: number,
    ): Promise<MessageDocument[]> {
        const filter: Record<string, unknown> = { chatId };
        if (before) {
            filter.createdAt = { $lt: new Date(before) };
        }

        return this.messages
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
    }

    async countMessages(
        chatId: string,
        before: string | undefined,
    ): Promise<number> {
        const filter: Record<string, unknown> = { chatId };
        if (before) {
            filter.createdAt = { $lt: new Date(before) };
        }
        return this.messages.countDocuments(filter);
    }

    async findMessageById(id: string): Promise<MessageDocument | null> {
        return this.messages.findOne({ _id: new ObjectId(id) });
    }

    async findMessageInChat(
        messageId: string,
        chatId: string,
    ): Promise<MessageDocument | null> {
        return this.messages.findOne({
            _id: new ObjectId(messageId),
            chatId,
        });
    }

    async pushMessageReport(
        messageId: string,
        report: MessageReport,
    ): Promise<void> {
        await this.messages.updateOne(
            { _id: new ObjectId(messageId) },
            { $push: { reports: report } as never },
        );
    }

    async deleteMessage(id: string): Promise<void> {
        await this.messages.deleteOne({ _id: new ObjectId(id) });
    }
}
