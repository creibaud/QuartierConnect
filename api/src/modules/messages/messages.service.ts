import {
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import {
    CHATS_COLLECTION,
    type ChatDocument,
} from "src/database/mongodb/models/chat.model";
import {
    MESSAGES_COLLECTION,
    type MessageDocument,
} from "src/database/mongodb/models/message.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { CreateChatDto } from "src/modules/messages/dto/create-chat.dto";
import { MessageQueryDto } from "src/modules/messages/dto/message-query.dto";
import { SendMessageDto } from "src/modules/messages/dto/send-message.dto";
import { MessagesGateway } from "src/modules/messages/messages.gateway";

@Injectable()
export class MessagesService {
    private readonly logger = new Logger(MessagesService.name);

    constructor(
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        private readonly gateway: MessagesGateway,
    ) {}

    async findMyChats(userId: string) {
        const chats = await this.mongo
            .collection<ChatDocument>(CHATS_COLLECTION)
            .find({ participantIds: userId })
            .sort({ lastMessageAt: -1 })
            .toArray();

        return chats.map((chat) => this.toChatResponse(chat));
    }

    async createChat(userId: string, dto: CreateChatDto) {
        const participantIds = [userId, ...dto.participantIds];

        if (participantIds.length === 2) {
            const existing = await this.mongo
                .collection<ChatDocument>(CHATS_COLLECTION)
                .findOne({
                    participantIds: { $all: participantIds, $size: 2 },
                });

            if (existing) {
                throw new ConflictException(
                    "A direct chat between these users already exists",
                );
            }
        }

        const now = new Date();
        const doc: ChatDocument = {
            participantIds,
            name: dto.name,
            createdAt: now,
            updatedAt: now,
        };

        const result = await this.mongo
            .collection<ChatDocument>(CHATS_COLLECTION)
            .insertOne(doc);

        const chatId = result.insertedId.toHexString();
        this.logger.log(`Chat created: ${chatId} by user ${userId}`);

        return this.toChatResponse({ ...doc, _id: result.insertedId });
    }

    async getChat(chatId: string, userId: string) {
        const chat = await this.mongo
            .collection<ChatDocument>(CHATS_COLLECTION)
            .findOne({ _id: new ObjectId(chatId) });

        if (!chat) {
            throw new NotFoundException("Chat not found");
        }

        if (!chat.participantIds.includes(userId)) {
            throw new ForbiddenException(
                "You are not a participant in this chat",
            );
        }

        return this.toChatResponse(chat);
    }

    async getMessages(chatId: string, userId: string, query: MessageQueryDto) {
        await this.getChat(chatId, userId);

        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = { chatId };

        if (query.before) {
            filter.createdAt = { $lt: new Date(query.before) };
        }

        const collection =
            this.mongo.collection<MessageDocument>(MESSAGES_COLLECTION);

        const [messages, total] = await Promise.all([
            collection
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(filter),
        ]);

        return {
            data: messages.map((message) => this.toMessageResponse(message)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async sendMessage(
        chatId: string,
        authorUserId: string,
        dto: SendMessageDto,
    ) {
        await this.getChat(chatId, authorUserId);

        const now = new Date();
        const doc: MessageDocument = {
            chatId,
            authorUserId,
            content: dto.content,
            attachments: [],
            createdAt: now,
            updatedAt: now,
        };

        const result = await this.mongo
            .collection<MessageDocument>(MESSAGES_COLLECTION)
            .insertOne(doc);

        await this.mongo
            .collection<ChatDocument>(CHATS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(chatId) },
                { $set: { lastMessageAt: now, updatedAt: now } },
            );

        const message = this.toMessageResponse({
            ...doc,
            _id: result.insertedId,
        });

        this.gateway.broadcastMessage(chatId, message);

        this.logger.log(
            `Message sent in chat ${chatId} by user ${authorUserId}`,
        );

        return message;
    }

    async deleteMessage(messageId: string, userId: string, userRole: string) {
        const message = await this.mongo
            .collection<MessageDocument>(MESSAGES_COLLECTION)
            .findOne({ _id: new ObjectId(messageId) });

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        const isPrivileged = userRole === "admin" || userRole === "moderator";
        if (message.authorUserId !== userId && !isPrivileged) {
            throw new ForbiddenException("You cannot delete this message");
        }

        await this.mongo
            .collection<MessageDocument>(MESSAGES_COLLECTION)
            .deleteOne({ _id: new ObjectId(messageId) });

        this.logger.log(`Message ${messageId} deleted by user ${userId}`);
    }

    private toChatResponse(chat: ChatDocument & { _id?: ObjectId }) {
        const { _id, ...rest } = chat;
        return { id: _id?.toString(), ...rest };
    }

    private toMessageResponse(msg: MessageDocument & { _id?: ObjectId }) {
        const { _id, ...rest } = msg;
        return { id: _id?.toString(), ...rest };
    }
}
