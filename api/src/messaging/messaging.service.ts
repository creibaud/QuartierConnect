import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
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

    findConversations(userId: string) {
        return this.conversationModel
            .find({ participants: userId })
            .sort({ lastMessageAt: -1 })
            .exec();
    }

    async createConversation(dto: CreateConversationDto, userId: string) {
        const participants = Array.from(new Set([userId, ...dto.participants]));
        const conversation = new this.conversationModel({
            participants,
            isGroup: dto.isGroup ?? false,
            groupName: dto.groupName ?? null,
            neighborhoodId: dto.neighborhoodId ?? null,
        });
        return conversation.save();
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
