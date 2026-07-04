import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    PayloadTooLargeException,
} from "@nestjs/common";
import { getConnectionToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MessagingController } from "./messaging.controller";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";
import { MessageType } from "./schemas/message.schema";

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
    assertParticipant: jest.fn(),
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

    describe("uploadFile", () => {
        const makeUpload = (mimetype: string, size = 1024) => ({
            originalname: "clip.bin",
            mimetype,
            size,
            buffer: Buffer.from("data"),
        });

        it("derives type audio for a whitelisted audio MIME with codecs", async () => {
            mockService.sendFileMessage.mockResolvedValue({
                ...mockMessage,
                type: MessageType.AUDIO,
            });
            await controller.uploadFile(
                "conv-1",
                makeUpload("audio/webm;codecs=opus") as any,
                req as any,
            );
            expect(mockService.sendFileMessage).toHaveBeenCalledWith(
                "conv-1",
                "user-1",
                expect.any(String),
                "clip.bin",
                MessageType.AUDIO,
            );
        });

        it("relays the audio message on new_message", async () => {
            const audioMessage = { ...mockMessage, type: MessageType.AUDIO };
            mockService.sendFileMessage.mockResolvedValue(audioMessage);
            await controller.uploadFile(
                "conv-1",
                makeUpload("audio/mpeg") as any,
                req as any,
            );
            expect(mockGateway.emitToConversation).toHaveBeenCalledWith(
                "conv-1",
                "new_message",
                audioMessage,
            );
        });

        it("rejects a non-whitelisted audio MIME with 400", async () => {
            await expect(
                controller.uploadFile(
                    "conv-1",
                    makeUpload("audio/wav") as any,
                    req as any,
                ),
            ).rejects.toThrow(BadRequestException);
            expect(mockService.sendFileMessage).not.toHaveBeenCalled();
        });

        it("rejects audio above 5 MB with 413", async () => {
            await expect(
                controller.uploadFile(
                    "conv-1",
                    makeUpload("audio/mp4", 5 * 1024 * 1024 + 1) as any,
                    req as any,
                ),
            ).rejects.toThrow(PayloadTooLargeException);
            expect(mockService.sendFileMessage).not.toHaveBeenCalled();
        });

        it("still derives type image for image MIME types", async () => {
            mockService.sendFileMessage.mockResolvedValue({
                ...mockMessage,
                type: MessageType.IMAGE,
            });
            await controller.uploadFile(
                "conv-1",
                makeUpload("image/png") as any,
                req as any,
            );
            expect(mockService.sendFileMessage).toHaveBeenCalledWith(
                "conv-1",
                "user-1",
                expect.any(String),
                "clip.bin",
                MessageType.IMAGE,
            );
        });

        it("keeps a large non-audio upload as type file", async () => {
            mockService.sendFileMessage.mockResolvedValue({
                ...mockMessage,
                type: MessageType.FILE,
            });
            await controller.uploadFile(
                "conv-1",
                makeUpload("application/pdf", 8 * 1024 * 1024) as any,
                req as any,
            );
            expect(mockService.sendFileMessage).toHaveBeenCalledWith(
                "conv-1",
                "user-1",
                expect.any(String),
                "clip.bin",
                MessageType.FILE,
            );
        });
    });
});
