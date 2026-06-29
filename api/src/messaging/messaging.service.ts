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

        return conversations.map((conv) => ({
            ...conv.toObject(),
            participantsInfo: conv.participants.map((id) => ({
                id,
                email: emailById.get(id) ?? null,
                name: nameById.get(id) ?? null,
            })),
        }));
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
