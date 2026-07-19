import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Model } from "mongoose";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import {
    Conversation,
    ConversationDocument,
} from "./schemas/conversation.schema";
import {
    Message,
    MessageDocument,
    MessageType,
} from "./schemas/message.schema";

export interface LastMessagePreview {
    senderId: string;
    type: MessageType;
    content: string | null;
    fileName: string | null;
    createdAt: Date;
}

@Injectable()
export class MessagingService {
    constructor(
        @InjectModel(Conversation.name)
        private readonly conversationModel: Model<ConversationDocument>,
        @InjectModel(Message.name)
        private readonly messageModel: Model<MessageDocument>,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    async isParticipant(
        conversationId: string,
        userId: string,
    ): Promise<boolean> {
        const conversation = await this.conversationModel
            .findById(conversationId, { participants: 1 })
            .exec();
        return !!conversation && conversation.participants.includes(userId);
    }

    async assertParticipant(
        conversationId: string,
        userId: string,
    ): Promise<void> {
        if (!(await this.isParticipant(conversationId, userId))) {
            throw new ForbiddenException("Not a participant");
        }
    }

    async findConversations(userId: string) {
        const conversations = await this.conversationModel
            .find({ participants: userId })
            .sort({ lastMessageAt: -1 })
            .exec();

        const participantIds = Array.from(
            new Set(conversations.flatMap((conv) => conv.participants)),
        );
        const users = participantIds.length
            ? await this.db
                  .select({
                      id: schema.users.id,
                      email: schema.users.email,
                      firstName: schema.users.firstName,
                      lastName: schema.users.lastName,
                  })
                  .from(schema.users)
                  .where(inArray(schema.users.id, participantIds))
            : [];
        const emailById = new Map(users.map((user) => [user.id, user.email]));
        const nameById = new Map(
            users.map((user) => [
                user.id,
                [user.firstName, user.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || null,
            ]),
        );

        const [lastMessageById, unreadCountById] = await Promise.all([
            this.findLastMessages(conversations),
            this.countUnreadMessages(conversations, userId),
        ]);

        return conversations.map((conv) => {
            const plain = conv.toObject();
            // Holds one marker per participant. The caller's own is already
            // folded into unreadCount, and the others are not theirs to read.
            delete (plain as { lastReadAt?: unknown }).lastReadAt;
            return {
                ...plain,
                participantsInfo: conv.participants.map((id) => ({
                    id,
                    email: emailById.get(id) ?? null,
                    name: nameById.get(id) ?? null,
                })),
                lastMessage: lastMessageById.get(String(conv._id)) ?? null,
                unreadCount: unreadCountById.get(String(conv._id)) ?? 0,
            };
        });
    }

    /**
     * The list needs a preview and a sender without loading every thread, so the
     * newest surviving message of each conversation is folded in here.
     */
    private async findLastMessages(
        conversations: ConversationDocument[],
    ): Promise<Map<string, LastMessagePreview>> {
        if (conversations.length === 0) return new Map();

        const rows = await this.messageModel.aggregate<
            { _id: string } & LastMessagePreview
        >([
            {
                $match: {
                    conversationId: {
                        $in: conversations.map((conv) => String(conv._id)),
                    },
                    deleted: false,
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$conversationId",
                    senderId: { $first: "$senderId" },
                    type: { $first: "$type" },
                    content: { $first: "$content" },
                    fileName: { $first: "$fileName" },
                    createdAt: { $first: "$createdAt" },
                },
            },
        ]);

        return new Map(
            rows.map(({ _id, ...preview }) => [
                _id,
                preview as LastMessagePreview,
            ]),
        );
    }

    /**
     * Counts what the user has not seen: messages from someone else, newer than
     * their own read marker. A conversation they never opened counts everything.
     */
    private async countUnreadMessages(
        conversations: ConversationDocument[],
        userId: string,
    ): Promise<Map<string, number>> {
        if (conversations.length === 0) return new Map();

        const perConversation = conversations.map((conv) => {
            const readAt = conv.lastReadAt?.get(userId);
            return {
                conversationId: String(conv._id),
                ...(readAt ? { createdAt: { $gt: readAt } } : {}),
            };
        });

        const rows = await this.messageModel.aggregate<{
            _id: string;
            count: number;
        }>([
            {
                $match: {
                    deleted: false,
                    senderId: { $ne: userId },
                    $or: perConversation,
                },
            },
            { $group: { _id: "$conversationId", count: { $sum: 1 } } },
        ]);

        return new Map(rows.map((row) => [row._id, row.count]));
    }

    /** The marker is server-stamped so a wrong client clock cannot hide messages. */
    async markConversationRead(
        conversationId: string,
        userId: string,
    ): Promise<{ readAt: string }> {
        await this.assertParticipant(conversationId, userId);
        const readAt = new Date();
        await this.conversationModel
            .updateOne(
                { _id: conversationId },
                { $set: { [`lastReadAt.${userId}`]: readAt } },
            )
            .exec();
        return { readAt: readAt.toISOString() };
    }

    async createConversation(dto: CreateConversationDto, userId: string) {
        const resolvedIds = await this.resolveParticipantIds(dto, userId);
        const participants = Array.from(new Set([userId, ...resolvedIds]));

        if (participants.length === 1) {
            throw new BadRequestException({
                code: "NO_OTHER_PARTICIPANTS",
                message:
                    "A conversation must include at least one other participant.",
            });
        }

        if (!dto.isGroup && participants.length === 2) {
            const existing = await this.conversationModel
                .findOne({
                    isGroup: false,
                    participants: { $all: participants, $size: 2 },
                })
                .exec();
            if (existing) return existing;
        }

        const conversation = new this.conversationModel({
            participants,
            isGroup: dto.isGroup ?? false,
            groupName: dto.groupName ?? null,
            neighborhoodId: dto.neighborhoodId ?? null,
        });
        return conversation.save();
    }

    private async resolveParticipantIds(
        dto: CreateConversationDto,
        currentUserId: string,
    ): Promise<string[]> {
        const ids = new Set<string>(dto.participants ?? []);

        if (dto.participantEmails && dto.participantEmails.length > 0) {
            const emails = dto.participantEmails.map((e) => e.toLowerCase());
            const rows = await this.db
                .select({
                    id: schema.users.id,
                    email: schema.users.email,
                })
                .from(schema.users)
                .where(inArray(schema.users.email, emails));

            const foundEmails = new Set(rows.map((r) => r.email.toLowerCase()));
            const missing = emails.filter((e) => !foundEmails.has(e));
            if (missing.length > 0) {
                throw new NotFoundException({
                    code: "USER_EMAIL_NOT_FOUND",
                    message: `No user found for: ${missing.join(", ")}`,
                });
            }
            for (const row of rows) {
                if (row.id !== currentUserId) ids.add(row.id);
            }
        }

        if (ids.size === 0) {
            throw new BadRequestException({
                code: "PARTICIPANTS_REQUIRED",
                message:
                    "Provide `participants` (UUIDs) or `participantEmails` (emails).",
            });
        }

        return Array.from(ids);
    }

    async getMessages(
        conversationId: string,
        userId: string,
        page = 1,
        limit = 50,
    ) {
        const conversation = await this.conversationModel
            .findById(conversationId)
            .exec();
        if (!conversation)
            throw new NotFoundException("Conversation not found");
        if (!conversation.participants.includes(userId)) {
            throw new ForbiddenException("Not a participant");
        }

        return this.messageModel
            .find({ conversationId, deleted: false })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();
    }

    async sendMessage(
        conversationId: string,
        senderId: string,
        content: string,
        type: MessageType = MessageType.TEXT,
    ) {
        const conversation = await this.conversationModel
            .findById(conversationId)
            .exec();
        if (!conversation)
            throw new NotFoundException("Conversation not found");
        if (!conversation.participants.includes(senderId)) {
            throw new ForbiddenException("Not a participant");
        }

        const message = new this.messageModel({
            conversationId,
            senderId,
            type,
            content,
        });

        const saved = await message.save();

        await this.conversationModel.findByIdAndUpdate(conversationId, {
            lastMessageAt: new Date(),
        });

        return saved;
    }

    async findOrCreateDirectConversation(
        userId: string,
        otherUserId: string,
    ): Promise<{ id: string }> {
        if (userId === otherUserId)
            throw new BadRequestException({ code: "SELF_CONVERSATION" });
        const participants = Array.from(new Set([userId, otherUserId]));
        const existing = await this.conversationModel
            .findOne({
                isGroup: false,
                participants: { $all: participants, $size: 2 },
            })
            .exec();
        if (existing) return { id: String(existing._id) };
        const created = await new this.conversationModel({
            participants,
            isGroup: false,
        }).save();
        return { id: String(created._id) };
    }

    async sendFileMessage(
        conversationId: string,
        senderId: string,
        fileId: string,
        fileName: string,
        type: MessageType,
    ) {
        const conversation = await this.conversationModel
            .findById(conversationId)
            .exec();
        if (!conversation)
            throw new NotFoundException("Conversation not found");
        if (!conversation.participants.includes(senderId)) {
            throw new ForbiddenException("Not a participant");
        }

        const message = new this.messageModel({
            conversationId,
            senderId,
            type,
            fileId,
            fileName,
        });

        const saved = await message.save();

        await this.conversationModel.findByIdAndUpdate(conversationId, {
            lastMessageAt: new Date(),
        });

        return saved;
    }
}
