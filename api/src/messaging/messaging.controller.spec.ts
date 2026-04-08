import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getConnectionToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MessagingController } from "./messaging.controller";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";

const mockConversation = {
    _id: "conv-1",
    participants: ["user-1", "user-2"],
    isGroup: false,
    lastMessageAt: null,
};

const mockMessage = {
    _id: "msg-1",
    conversationId: "conv-1",
    senderId: "user-1",
    type: "text",
    content: "Hello",
};

const mockService = {
    findConversations: jest.fn(),
    createConversation: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    sendFileMessage: jest.fn(),
};

const mockGateway = {
    emitToConversation: jest.fn(),
};

const mockConnection = {
    db: {
        collection: jest.fn(),
    },
};

describe("MessagingController", () => {
    let controller: MessagingController;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MessagingController],
            providers: [
                { provide: MessagingService, useValue: mockService },
                { provide: MessagingGateway, useValue: mockGateway },
                { provide: getConnectionToken(), useValue: mockConnection },
            ],
        }).compile();

        controller = module.get<MessagingController>(MessagingController);
        (controller as unknown as Record<string, unknown>)["bucket"] = {
            openUploadStreamWithId: jest.fn().mockReturnValue({
                end: jest.fn((buf: unknown, cb: () => void) => cb()),
            }),
        };
    });

    const req = { user: { sub: "user-1" } };

    it("findConversations returns user conversations", async () => {
        mockService.findConversations.mockResolvedValue([mockConversation]);
        const result = await controller.findConversations(req as any);
        expect(result).toHaveLength(1);
        expect(mockService.findConversations).toHaveBeenCalledWith("user-1");
    });

    it("createConversation adds creator to participants", async () => {
        mockService.createConversation.mockResolvedValue(mockConversation);
        const dto = { participants: ["user-2"], isGroup: false };
        const result = await controller.createConversation(
            dto as any,
            req as any,
        );
        expect(result).toEqual(mockConversation);
    });

    it("getMessages returns paginated messages", async () => {
        mockService.getMessages.mockResolvedValue([mockMessage]);
        const result = await controller.getMessages("conv-1", req as any);
        expect(result).toHaveLength(1);
    });

    it("getMessages throws 403 for non-participant", async () => {
        mockService.getMessages.mockRejectedValue(new ForbiddenException());
        await expect(
            controller.getMessages("conv-1", { user: { sub: "other" } } as any),
        ).rejects.toThrow(ForbiddenException);
    });

    it("getMessages throws 404 for missing conversation", async () => {
        mockService.getMessages.mockRejectedValue(new NotFoundException());
        await expect(
            controller.getMessages("missing", req as any),
        ).rejects.toThrow(NotFoundException);
    });
});
