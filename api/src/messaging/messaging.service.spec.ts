import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MessagingService } from "./messaging.service";
import { Conversation } from "./schemas/conversation.schema";
import { Message, MessageType } from "./schemas/message.schema";

const mockConversation = {
    _id: "conv-1",
    participants: ["user-1", "user-2"],
    isGroup: false,
    save: jest.fn(),
};

const mockMessage = {
    _id: "msg-1",
    save: jest.fn().mockResolvedValue({ _id: "msg-1" }),
};

function makeConvModel(overrides?: object) {
    return {
        find: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        ...overrides,
    };
}

function makeMsgModel(overrides?: object) {
    const self = {
        find: jest.fn(),
        ...overrides,
    };
    return self;
}

let convModel: ReturnType<typeof makeConvModel>;
let msgModel: ReturnType<typeof makeMsgModel>;

describe("MessagingService", () => {
    let service: MessagingService;

    beforeEach(async () => {
        jest.clearAllMocks();
        convModel = makeConvModel();
        msgModel = makeMsgModel();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagingService,
                {
                    provide: getModelToken(Conversation.name),
                    useValue: convModel,
                },
                { provide: getModelToken(Message.name), useValue: msgModel },
            ],
        }).compile();

        service = module.get<MessagingService>(MessagingService);
    });

    describe("isParticipant", () => {
        it("returns true when user is a participant", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });
            const result = await service.isParticipant("conv-1", "user-1");
            expect(result).toBe(true);
        });

        it("returns false when user is not a participant", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });
            const result = await service.isParticipant("conv-1", "user-99");
            expect(result).toBe(false);
        });

        it("returns false when conversation not found", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            const result = await service.isParticipant("conv-x", "user-1");
            expect(result).toBe(false);
        });
    });

    describe("findConversations", () => {
        it("returns conversations where user participates", async () => {
            convModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([mockConversation]),
                }),
            });

            const result = await service.findConversations("user-1");
            expect(result).toHaveLength(1);
        });
    });

    describe("createConversation", () => {
        it("creates a conversation deduplicating creator from participants", async () => {
            const saved = {
                _id: "conv-new",
                participants: ["user-1", "user-2"],
            };
            const convInstance = { save: jest.fn().mockResolvedValue(saved) };

            const ConvModelCtor = jest
                .fn()
                .mockImplementation(() => convInstance);
            Object.assign(ConvModelCtor, convModel);

            const module2: TestingModule = await Test.createTestingModule({
                providers: [
                    MessagingService,
                    {
                        provide: getModelToken(Conversation.name),
                        useValue: ConvModelCtor,
                    },
                    {
                        provide: getModelToken(Message.name),
                        useValue: msgModel,
                    },
                ],
            }).compile();
            const svc2 = module2.get<MessagingService>(MessagingService);

            const dto = { participants: ["user-1", "user-2"], isGroup: false };
            const result = await svc2.createConversation(dto, "user-1");
            expect(result.participants).toEqual(["user-1", "user-2"]);
        });
    });

    describe("getMessages", () => {
        it("returns messages for a valid participant", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });
            msgModel.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([{ _id: "msg-1" }]),
            });

            const result = await service.getMessages("conv-1", "user-1");
            expect(result).toHaveLength(1);
        });

        it("throws NotFoundException when conversation missing", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            await expect(
                service.getMessages("conv-x", "user-1"),
            ).rejects.toThrow(NotFoundException);
        });

        it("throws ForbiddenException when user not a participant", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });
            await expect(
                service.getMessages("conv-1", "user-99"),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("sendMessage", () => {
        it("sends a text message and updates lastMessageAt", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });
            convModel.findByIdAndUpdate.mockResolvedValue({});

            const msgInstance = {
                save: jest.fn().mockResolvedValue(mockMessage),
            };
            const MsgModelCtor = jest
                .fn()
                .mockImplementation(() => msgInstance);
            Object.assign(MsgModelCtor, msgModel);

            const module3: TestingModule = await Test.createTestingModule({
                providers: [
                    MessagingService,
                    {
                        provide: getModelToken(Conversation.name),
                        useValue: convModel,
                    },
                    {
                        provide: getModelToken(Message.name),
                        useValue: MsgModelCtor,
                    },
                ],
            }).compile();
            const svc3 = module3.get<MessagingService>(MessagingService);

            const result = await svc3.sendMessage("conv-1", "user-1", "Hello");
            expect(result._id).toBe("msg-1");
            expect(convModel.findByIdAndUpdate).toHaveBeenCalled();
        });

        it("throws NotFoundException when conversation missing", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            await expect(
                service.sendMessage("conv-x", "user-1", "Hi"),
            ).rejects.toThrow(NotFoundException);
        });

        it("throws ForbiddenException when sender not a participant", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });
            await expect(
                service.sendMessage("conv-1", "user-99", "Hi"),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("sendFileMessage", () => {
        it("throws NotFoundException when conversation missing", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            await expect(
                service.sendFileMessage(
                    "conv-x",
                    "user-1",
                    "file-1",
                    "doc.pdf",
                    MessageType.FILE,
                ),
            ).rejects.toThrow(NotFoundException);
        });

        it("throws ForbiddenException when sender not a participant", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });
            await expect(
                service.sendFileMessage(
                    "conv-1",
                    "user-99",
                    "file-1",
                    "doc.pdf",
                    MessageType.FILE,
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it("sends file message successfully", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });
            convModel.findByIdAndUpdate.mockResolvedValue({});

            const msgInstance = {
                save: jest.fn().mockResolvedValue(mockMessage),
            };
            const MsgModelCtor = jest
                .fn()
                .mockImplementation(() => msgInstance);
            Object.assign(MsgModelCtor, msgModel);

            const module4: TestingModule = await Test.createTestingModule({
                providers: [
                    MessagingService,
                    {
                        provide: getModelToken(Conversation.name),
                        useValue: convModel,
                    },
                    {
                        provide: getModelToken(Message.name),
                        useValue: MsgModelCtor,
                    },
                ],
            }).compile();
            const svc4 = module4.get<MessagingService>(MessagingService);

            const result = await svc4.sendFileMessage(
                "conv-1",
                "user-1",
                "file-1",
                "doc.pdf",
                MessageType.FILE,
            );
            expect(result._id).toBe("msg-1");
        });
    });
});
