import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import type { IMessagesRepository } from "src/modules/messages/message.repository";
import { MessagesService } from "src/modules/messages/messages.service";

const USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CHAT_ID = new ObjectId().toHexString();
const MESSAGE_ID = new ObjectId().toHexString();

const baseChat = {
    _id: new ObjectId(CHAT_ID),
    participantIds: [USER_ID, OTHER_USER_ID],
    createdAt: new Date(),
    updatedAt: new Date(),
};

const baseMessage = {
    _id: new ObjectId(MESSAGE_ID),
    chatId: CHAT_ID,
    authorUserId: USER_ID,
    content: "Hello",
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("MessagesService", () => {
    let service: MessagesService;
    let repository: jest.Mocked<IMessagesRepository>;
    let gateway: { broadcastMessage: jest.Mock };

    beforeEach(() => {
        repository = {
            findUserChats: jest.fn().mockResolvedValue([baseChat]),
            findDirectChat: jest.fn().mockResolvedValue(null),
            createChat: jest.fn().mockResolvedValue(new ObjectId(CHAT_ID)),
            findChatById: jest.fn().mockResolvedValue(baseChat),
            updateChatLastMessageAt: jest.fn().mockResolvedValue(undefined),
            createMessage: jest
                .fn()
                .mockResolvedValue(new ObjectId(MESSAGE_ID)),
            findMessages: jest.fn().mockResolvedValue([baseMessage]),
            countMessages: jest.fn().mockResolvedValue(1),
            findMessageById: jest.fn().mockResolvedValue(baseMessage),
            findMessageInChat: jest.fn().mockResolvedValue(baseMessage),
            pushMessageReport: jest.fn().mockResolvedValue(undefined),
            deleteMessage: jest.fn().mockResolvedValue(undefined),
        };

        gateway = { broadcastMessage: jest.fn() };

        service = new MessagesService(repository, gateway);
    });

    describe("findMyChats", () => {
        it("returns chats for the user", async () => {
            const result = await service.findMyChats(USER_ID);

            expect(repository.findUserChats).toHaveBeenCalledWith(USER_ID);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(CHAT_ID);
        });
    });

    describe("createChat", () => {
        it("creates a new 1-to-1 chat when none exists", async () => {
            repository.findDirectChat.mockResolvedValue(null);

            const result = await service.createChat(USER_ID, {
                participantIds: [OTHER_USER_ID],
            });

            expect(repository.createChat).toHaveBeenCalled();
            expect(result.participantIds).toContain(USER_ID);
            expect(result.participantIds).toContain(OTHER_USER_ID);
        });

        it("throws ConflictException when 1-to-1 chat already exists", async () => {
            repository.findDirectChat.mockResolvedValue(baseChat);

            await expect(
                service.createChat(USER_ID, {
                    participantIds: [OTHER_USER_ID],
                }),
            ).rejects.toBeInstanceOf(ConflictException);
        });

        it("allows creating group chats without duplicate check", async () => {
            await service.createChat(USER_ID, {
                participantIds: [OTHER_USER_ID, "third-user"],
            });

            expect(repository.findDirectChat).not.toHaveBeenCalled();
            expect(repository.createChat).toHaveBeenCalled();
        });
    });

    describe("getChat", () => {
        it("returns chat when user is a participant", async () => {
            const result = await service.getChat(CHAT_ID, USER_ID);
            expect(result.id).toBe(CHAT_ID);
        });

        it("throws NotFoundException when chat does not exist", async () => {
            repository.findChatById.mockResolvedValue(null);

            await expect(
                service.getChat(CHAT_ID, USER_ID),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it("throws ForbiddenException when user is not a participant", async () => {
            await expect(
                service.getChat(CHAT_ID, "non-participant"),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });
    });

    describe("sendMessage", () => {
        it("sends a message and broadcasts it", async () => {
            const result = await service.sendMessage(CHAT_ID, USER_ID, {
                content: "Hello",
            });

            expect(repository.createMessage).toHaveBeenCalled();
            expect(repository.updateChatLastMessageAt).toHaveBeenCalledWith(
                CHAT_ID,
                expect.any(Date),
            );
            expect(gateway.broadcastMessage).toHaveBeenCalledWith(
                CHAT_ID,
                expect.objectContaining({ content: "Hello" }),
            );
            expect(result.content).toBe("Hello");
        });

        it("throws ForbiddenException when user is not a participant", async () => {
            repository.findChatById.mockResolvedValue(baseChat);

            await expect(
                service.sendMessage(CHAT_ID, "non-participant", {
                    content: "Hi",
                }),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });
    });

    describe("reportMessage", () => {
        it("submits a report successfully", async () => {
            repository.findMessageById.mockResolvedValue({
                ...baseMessage,
                reports: [],
            });

            const result = await service.reportMessage(
                CHAT_ID,
                MESSAGE_ID,
                OTHER_USER_ID,
                { reason: "Spam" },
            );

            expect(repository.pushMessageReport).toHaveBeenCalled();
            expect(result).toHaveProperty(
                "message",
                "Report submitted successfully",
            );
        });

        it("throws BadRequestException when user already reported the message", async () => {
            repository.findMessageInChat.mockResolvedValue({
                ...baseMessage,
                reports: [
                    { reportedBy: OTHER_USER_ID, reportedAt: new Date() },
                ],
            });

            await expect(
                service.reportMessage(CHAT_ID, MESSAGE_ID, OTHER_USER_ID, {}),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("auto-deletes message when report threshold is reached", async () => {
            repository.findMessageInChat.mockResolvedValue({
                ...baseMessage,
                reports: [],
            });
            repository.findMessageById.mockResolvedValue({
                ...baseMessage,
                reports: Array(5).fill({
                    reportedBy: "user",
                    reportedAt: new Date(),
                }),
            });

            const result = await service.reportMessage(
                CHAT_ID,
                MESSAGE_ID,
                OTHER_USER_ID,
                {},
            );

            expect(repository.deleteMessage).toHaveBeenCalledWith(MESSAGE_ID);
            expect(result).toHaveProperty(
                "message",
                "Message removed due to excessive reports",
            );
        });

        it("throws NotFoundException when message does not exist in chat", async () => {
            repository.findMessageInChat.mockResolvedValue(null);

            await expect(
                service.reportMessage(CHAT_ID, MESSAGE_ID, USER_ID, {}),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe("deleteMessage", () => {
        it("allows message author to delete their message", async () => {
            await expect(
                service.deleteMessage(MESSAGE_ID, USER_ID, "resident"),
            ).resolves.toBeUndefined();

            expect(repository.deleteMessage).toHaveBeenCalledWith(MESSAGE_ID);
        });

        it("allows a moderator to delete any message", async () => {
            await expect(
                service.deleteMessage(MESSAGE_ID, "moderator-id", "moderator"),
            ).resolves.toBeUndefined();
        });

        it("allows an admin to delete any message", async () => {
            await expect(
                service.deleteMessage(MESSAGE_ID, "admin-id", "admin"),
            ).resolves.toBeUndefined();
        });

        it("throws ForbiddenException when non-author non-privileged tries to delete", async () => {
            await expect(
                service.deleteMessage(MESSAGE_ID, "other-user", "resident"),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it("throws NotFoundException when message does not exist", async () => {
            repository.findMessageById.mockResolvedValue(null);

            await expect(
                service.deleteMessage(MESSAGE_ID, USER_ID, "resident"),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
