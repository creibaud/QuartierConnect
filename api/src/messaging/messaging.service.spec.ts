import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { MessagingService } from "./messaging.service";
import { Conversation } from "./schemas/conversation.schema";
import { Message, MessageType } from "./schemas/message.schema";

const mockConversation = {
    _id: "conv-1",
    participants: ["user-1", "user-2"],
    isGroup: false,
    save: jest.fn(),
    toObject() {
        return {
            _id: this._id,
            participants: this.participants,
            isGroup: this.isGroup,
        };
    },
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
        aggregate: jest.fn().mockResolvedValue([]),
        ...overrides,
    };
    return self;
}

function makeMockDb() {
    const builder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
    };
    return { select: jest.fn().mockReturnValue(builder), _builder: builder };
}

let convModel: ReturnType<typeof makeConvModel>;
let msgModel: ReturnType<typeof makeMsgModel>;
let mockDb: ReturnType<typeof makeMockDb>;

describe("MessagingService", () => {
    let service: MessagingService;

    beforeEach(async () => {
        jest.clearAllMocks();
        convModel = makeConvModel();
        msgModel = makeMsgModel();
        mockDb = makeMockDb();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagingService,
                {
                    provide: getModelToken(Conversation.name),
                    useValue: convModel,
                },
                { provide: getModelToken(Message.name), useValue: msgModel },
                { provide: DRIZZLE_TOKEN, useValue: mockDb },
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
        beforeEach(() => {
            convModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([mockConversation]),
                }),
            });
        });

        it("returns conversations where user participates", async () => {
            const result = await service.findConversations("user-1");
            expect(result).toHaveLength(1);
        });

        it("reports the unread count the aggregation returned", async () => {
            msgModel.aggregate
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ _id: "conv-1", count: 3 }]);

            const [conversation] = await service.findConversations("user-1");
            expect(conversation.unreadCount).toBe(3);
        });

        it("reports zero unread when the aggregation skipped the conversation", async () => {
            const [conversation] = await service.findConversations("user-1");
            expect(conversation.unreadCount).toBe(0);
        });

        it("counts only messages newer than the caller read marker", async () => {
            const readAt = new Date("2026-05-01T00:00:00.000Z");
            convModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([
                        {
                            ...mockConversation,
                            lastReadAt: new Map([["user-1", readAt]]),
                        },
                    ]),
                }),
            });

            await service.findConversations("user-1");

            const [, unreadPipeline] = msgModel.aggregate.mock.calls;
            expect(unreadPipeline[0][0].$match.$or).toEqual([
                { conversationId: "conv-1", createdAt: { $gt: readAt } },
            ]);
        });
    });

    describe("markConversationRead", () => {
        it("stamps the caller marker on the conversation", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });
            const updateOne = jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({}),
            });
            Object.assign(convModel, { updateOne });

            const { readAt } = await service.markConversationRead(
                "conv-1",
                "user-1",
            );

            expect(updateOne).toHaveBeenCalledWith(
                { _id: "conv-1" },
                { $set: { "lastReadAt.user-1": new Date(readAt) } },
            );
        });

        it("refuses a non-participant", async () => {
            convModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockConversation),
            });

            await expect(
                service.markConversationRead("conv-1", "intruder"),
            ).rejects.toThrow(ForbiddenException);
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
            Object.assign(ConvModelCtor, convModel, {
                findOne: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(null),
                }),
            });

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
                    { provide: DRIZZLE_TOKEN, useValue: mockDb },
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
                    { provide: DRIZZLE_TOKEN, useValue: mockDb },
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

    describe("findOrCreateDirectConversation", () => {
        it("returns existing conversation id without calling save", async () => {
            const findOneMock = jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({ _id: "c1" }),
            });
            const saveMock = jest.fn();
            const ConvModelCtor = jest
                .fn()
                .mockImplementation(() => ({ save: saveMock }));
            Object.assign(ConvModelCtor, convModel, { findOne: findOneMock });

            const moduleA: TestingModule = await Test.createTestingModule({
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
                    { provide: DRIZZLE_TOKEN, useValue: mockDb },
                ],
            }).compile();
            const svcA = moduleA.get<MessagingService>(MessagingService);

            const result = await svcA.findOrCreateDirectConversation(
                "me",
                "other",
            );
            expect(result).toEqual({ id: "c1" });
            expect(saveMock).not.toHaveBeenCalled();
        });

        it("creates and returns new conversation id when none exists", async () => {
            const newId = "new-conv-1";
            const saveMock = jest.fn().mockResolvedValue({ _id: newId });
            const findOneMock = jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            const ConvModelCtor = jest
                .fn()
                .mockImplementation(() => ({ save: saveMock }));
            Object.assign(ConvModelCtor, convModel, { findOne: findOneMock });

            const moduleB: TestingModule = await Test.createTestingModule({
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
                    { provide: DRIZZLE_TOKEN, useValue: mockDb },
                ],
            }).compile();
            const svcB = moduleB.get<MessagingService>(MessagingService);

            const result = await svcB.findOrCreateDirectConversation(
                "me",
                "other",
            );
            expect(result).toEqual({ id: newId });
            expect(saveMock).toHaveBeenCalledTimes(1);
        });

        it("throws BadRequestException with SELF_CONVERSATION when ids are equal", async () => {
            await expect(
                service.findOrCreateDirectConversation("user-1", "user-1"),
            ).rejects.toBeInstanceOf(BadRequestException);

            await expect(
                service.findOrCreateDirectConversation("user-1", "user-1"),
            ).rejects.toMatchObject({
                response: { code: "SELF_CONVERSATION" },
            });
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
                    { provide: DRIZZLE_TOKEN, useValue: mockDb },
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
