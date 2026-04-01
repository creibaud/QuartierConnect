import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import type { MessageReport } from "src/database/mongodb/models/message.model";
import { REPORT_AUTO_DELETE_THRESHOLD } from "src/database/mongodb/models/message.model";
import { CreateChatDto } from "src/modules/messages/dto/create-chat.dto";
import { MessageQueryDto } from "src/modules/messages/dto/message-query.dto";
import { ReportMessageDto } from "src/modules/messages/dto/report-message.dto";
import { SendMessageDto } from "src/modules/messages/dto/send-message.dto";
import type { IMessagesRepository } from "src/modules/messages/message.repository";
import { MessagesGateway } from "src/modules/messages/messages.gateway";

@Injectable()
export class MessagesService {
    private readonly logger = new Logger(MessagesService.name);

    constructor(
        @Inject("IMessagesRepository")
        private readonly messagesRepository: IMessagesRepository,
        private readonly gateway: MessagesGateway,
    ) {}

    async findMyChats(userId: string) {
        const chats = await this.messagesRepository.findUserChats(userId);
        return chats.map((chat) => this.toChatResponse(chat));
    }

    async createChat(userId: string, dto: CreateChatDto) {
        const participantIds = [userId, ...dto.participantIds];

        if (participantIds.length === 2) {
            const existing =
                await this.messagesRepository.findDirectChat(participantIds);

            if (existing) {
                throw new ConflictException(
                    "A direct chat between these users already exists",
                );
            }
        }

        const now = new Date();
        const insertedId = await this.messagesRepository.createChat({
            participantIds,
            name: dto.name,
            createdAt: now,
            updatedAt: now,
        });

        const chatId = insertedId.toHexString();
        this.logger.log(`Chat created: ${chatId} by user ${userId}`);

        return {
            id: chatId,
            participantIds,
            name: dto.name,
            createdAt: now,
            updatedAt: now,
        };
    }

    async getChat(chatId: string, userId: string) {
        const chat = await this.messagesRepository.findChatById(chatId);

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

        const [messages, total] = await Promise.all([
            this.messagesRepository.findMessages(
                chatId,
                query.before,
                skip,
                limit,
            ),
            this.messagesRepository.countMessages(chatId, query.before),
        ]);

        return {
            data: messages.map((msg) => this.toMessageResponse(msg)),
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
        const insertedId = await this.messagesRepository.createMessage({
            chatId,
            authorUserId,
            content: dto.content,
            attachments: [],
            createdAt: now,
            updatedAt: now,
        });

        await this.messagesRepository.updateChatLastMessageAt(chatId, now);

        const message = {
            id: insertedId.toHexString(),
            chatId,
            authorUserId,
            content: dto.content,
            attachments: [],
            createdAt: now,
            updatedAt: now,
        };

        this.gateway.broadcastMessage(chatId, message);

        this.logger.log(
            `Message sent in chat ${chatId} by user ${authorUserId}`,
        );

        return message;
    }

    async reportMessage(
        chatId: string,
        messageId: string,
        userId: string,
        dto: ReportMessageDto,
    ) {
        await this.getChat(chatId, userId);

        const message = await this.messagesRepository.findMessageInChat(
            messageId,
            chatId,
        );

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        const alreadyReported = (message.reports ?? []).some(
            (r) => r.reportedBy === userId,
        );
        if (alreadyReported) {
            throw new BadRequestException(
                "You have already reported this message",
            );
        }

        const report: MessageReport = {
            reportedBy: userId,
            reason: dto.reason,
            reportedAt: new Date(),
        };

        await this.messagesRepository.pushMessageReport(messageId, report);

        const updated =
            await this.messagesRepository.findMessageById(messageId);
        const reportCount = updated?.reports?.length ?? 0;

        if (reportCount >= REPORT_AUTO_DELETE_THRESHOLD) {
            await this.messagesRepository.deleteMessage(messageId);
            this.logger.warn(
                `Message ${messageId} auto-deleted after ${reportCount} reports`,
            );
            return { message: "Message removed due to excessive reports" };
        }

        this.logger.log(
            `Message ${messageId} reported by user ${userId} (${reportCount} reports total)`,
        );

        return { message: "Report submitted successfully", reportCount };
    }

    async deleteMessage(messageId: string, userId: string, userRole: string) {
        const message =
            await this.messagesRepository.findMessageById(messageId);

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        const isPrivileged = userRole === "admin" || userRole === "moderator";
        if (message.authorUserId !== userId && !isPrivileged) {
            throw new ForbiddenException("You cannot delete this message");
        }

        await this.messagesRepository.deleteMessage(messageId);

        this.logger.log(`Message ${messageId} deleted by user ${userId}`);
    }

    private toChatResponse(chat: { _id?: unknown; [key: string]: unknown }) {
        const { _id, ...rest } = chat;
        return {
            id: (_id as { toString(): string } | undefined)?.toString(),
            ...rest,
        };
    }

    private toMessageResponse(msg: { _id?: unknown; [key: string]: unknown }) {
        const { _id, ...rest } = msg;
        return {
            id: (_id as { toString(): string } | undefined)?.toString(),
            ...rest,
        };
    }
}
