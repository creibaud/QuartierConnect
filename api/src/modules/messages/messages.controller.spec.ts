import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";

describe("MessagesController", () => {
    let controller: MessagesController;
    let service: MessagesService;

    const mockUser = {
        id: "user-uuid",
        email: "user@test.local",
        role: "resident" as const,
        isActive: true,
    };

    const mockOtherUser = {
        id: "other-user-id",
        email: "other@test.local",
        role: "resident" as const,
        isActive: true,
    };

    const mockChat = {
        id: "chat-uuid",
        participantIds: [mockUser.id, mockOtherUser.id],
        name: null,
        createdAt: new Date(),
    };

    const mockMessage = {
        id: "message-uuid",
        chatId: "chat-uuid",
        senderId: mockUser.id,
        content: "Hello!",
        createdAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MessagesController],
            providers: [
                {
                    provide: MessagesService,
                    useValue: {
                        findMyChats: jest.fn(),
                        createChat: jest.fn(),
                        getChat: jest.fn(),
                        getMessages: jest.fn(),
                        sendMessage: jest.fn(),
                        reportMessage: jest.fn(),
                        deleteMessage: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<MessagesController>(MessagesController);
        service = module.get<MessagesService>(MessagesService);
    });

    describe("findMyChats", () => {
        it("should return user's chats", async () => {
            const chats = [mockChat];
            service.findMyChats.mockResolvedValue(chats);

            const result = await controller.findMyChats(mockUser);

            expect(service.findMyChats).toHaveBeenCalledWith(mockUser.id);
            expect(result).toHaveLength(1);
        });

        it("should return empty list if no chats", async () => {
            service.findMyChats.mockResolvedValue([]);

            const result = await controller.findMyChats(mockUser);

            expect(result).toHaveLength(0);
        });
    });

    describe("createChat", () => {
        it("should create a new chat with one other user", async () => {
            const createDto = { participantIds: [mockOtherUser.id] };
            service.createChat.mockResolvedValue(mockChat);

            const result = await controller.createChat(mockUser, createDto);

            expect(service.createChat).toHaveBeenCalledWith(
                mockUser.id,
                createDto,
            );
            expect(result.id).toBe("chat-uuid");
        });

        it("should throw ConflictException if direct chat already exists", async () => {
            service.createChat.mockRejectedValue(
                new ConflictException("Direct chat already exists"),
            );

            await expect(
                controller.createChat(mockUser, {
                    participantIds: [mockOtherUser.id],
                }),
            ).rejects.toThrow(ConflictException);
        });

        it("should create a group chat with multiple users", async () => {
            const groupChat = { ...mockChat, name: "Project Team" };
            const createDto = {
                participantIds: [mockOtherUser.id, "user3-id"],
                name: "Project Team",
            };
            service.createChat.mockResolvedValue(groupChat);

            const result = await controller.createChat(mockUser, createDto);

            expect(result.name).toBe("Project Team");
        });
    });

    describe("getChat", () => {
        it("should return a chat if user is participant", async () => {
            service.getChat.mockResolvedValue(mockChat);

            const result = await controller.getChat("chat-uuid", mockUser);

            expect(service.getChat).toHaveBeenCalledWith(
                "chat-uuid",
                mockUser.id,
            );
            expect(result.id).toBe("chat-uuid");
        });

        it("should throw ForbiddenException if not a participant", async () => {
            service.getChat.mockRejectedValue(
                new ForbiddenException("Not a participant"),
            );

            await expect(
                controller.getChat("chat-uuid", {
                    ...mockUser,
                    id: "outsider-id",
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw NotFoundException if chat not found", async () => {
            service.getChat.mockRejectedValue(
                new NotFoundException("Chat not found"),
            );

            await expect(
                controller.getChat("non-existent", mockUser),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("getMessages", () => {
        it("should return paginated messages for a chat", async () => {
            const query = { page: 1, limit: 20 };
            const paginated = {
                data: [mockMessage],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 20,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.getMessages.mockResolvedValue(paginated);

            const result = await controller.getMessages(
                "chat-uuid",
                mockUser,
                query,
            );

            expect(service.getMessages).toHaveBeenCalledWith(
                "chat-uuid",
                mockUser.id,
                query,
            );
            expect(result.data).toHaveLength(1);
        });

        it("should throw ForbiddenException if not a participant", async () => {
            service.getMessages.mockRejectedValue(
                new ForbiddenException("Not a participant"),
            );

            await expect(
                controller.getMessages(
                    "chat-uuid",
                    { ...mockUser, id: "outsider-id" },
                    { page: 1, limit: 20 },
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should support pagination", async () => {
            const query = { page: 2, limit: 10 };
            const paginated = {
                data: [],
                meta: {
                    total: 15,
                    page: 2,
                    limit: 10,
                    pages: 2,
                    hasNextPage: false,
                    hasPrevPage: true,
                },
            };
            service.getMessages.mockResolvedValue(paginated);

            const result = await controller.getMessages(
                "chat-uuid",
                mockUser,
                query,
            );

            expect(result.meta.page).toBe(2);
            expect(result.meta.hasPrevPage).toBe(true);
        });
    });

    describe("sendMessage", () => {
        it("should send a message to a chat", async () => {
            const sendDto = { content: "Hello!" };
            service.sendMessage.mockResolvedValue(mockMessage);

            const result = await controller.sendMessage(
                "chat-uuid",
                mockUser,
                sendDto,
            );

            expect(service.sendMessage).toHaveBeenCalledWith(
                "chat-uuid",
                mockUser.id,
                sendDto,
            );
            expect(result.senderId).toBe(mockUser.id);
        });

        it("should throw ForbiddenException if not a participant", async () => {
            service.sendMessage.mockRejectedValue(
                new ForbiddenException("Not a participant"),
            );

            await expect(
                controller.sendMessage(
                    "chat-uuid",
                    { ...mockUser, id: "outsider-id" },
                    { content: "Hi" },
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw BadRequestException on empty content", async () => {
            service.sendMessage.mockRejectedValue(
                new BadRequestException("Content cannot be empty"),
            );

            await expect(
                controller.sendMessage("chat-uuid", mockUser, { content: "" }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe("reportMessage", () => {
        it("should report a message", async () => {
            const reportDto = { reason: "inappropriate" };
            const response = {
                message: "Report submitted successfully",
                reportCount: 1,
            };
            service.reportMessage.mockResolvedValue(response);

            const result = await controller.reportMessage(
                "chat-uuid",
                "message-uuid",
                mockUser,
                reportDto,
            );

            expect(service.reportMessage).toHaveBeenCalledWith(
                "chat-uuid",
                "message-uuid",
                mockUser.id,
                reportDto,
            );
            expect(result.message).toContain("Report submitted");
        });

        it("should throw BadRequestException if already reported", async () => {
            service.reportMessage.mockRejectedValue(
                new BadRequestException("Already reported"),
            );

            await expect(
                controller.reportMessage(
                    "chat-uuid",
                    "message-uuid",
                    mockUser,
                    { reason: "spam" },
                ),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw ForbiddenException if not a participant", async () => {
            service.reportMessage.mockRejectedValue(
                new ForbiddenException("Not a participant"),
            );

            await expect(
                controller.reportMessage(
                    "chat-uuid",
                    "message-uuid",
                    { ...mockUser, id: "outsider-id" },
                    { reason: "spam" },
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw NotFoundException if message not found", async () => {
            service.reportMessage.mockRejectedValue(
                new NotFoundException("Message not found"),
            );

            await expect(
                controller.reportMessage(
                    "chat-uuid",
                    "non-existent",
                    mockUser,
                    { reason: "spam" },
                ),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("deleteMessage", () => {
        it("should delete a message (sender or admin)", async () => {
            service.deleteMessage = jest.fn().mockResolvedValue(undefined);

            // Controller signature: deleteMessage(msgId, user)
            // Controller passes to service: deleteMessage(msgId, user.id, user.role)
            await controller.deleteMessage("message-uuid", mockUser);

            expect(service.deleteMessage).toHaveBeenCalledWith(
                "message-uuid",
                mockUser.id,
                mockUser.role,
            );
        });

        it("should throw ForbiddenException if not sender or admin", async () => {
            service.deleteMessage = jest
                .fn()
                .mockRejectedValue(
                    new ForbiddenException("Cannot delete this message"),
                );

            await expect(
                controller.deleteMessage("message-uuid", mockOtherUser),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw NotFoundException if message not found", async () => {
            service.deleteMessage = jest
                .fn()
                .mockRejectedValue(new NotFoundException("Message not found"));

            await expect(
                controller.deleteMessage("non-existent", mockUser),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
