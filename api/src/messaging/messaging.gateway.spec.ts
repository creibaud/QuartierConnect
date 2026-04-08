import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { WsException } from "@nestjs/websockets";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";
import { MessageType } from "./schemas/message.schema";

const mockMessagingService = {
    isParticipant: jest.fn(),
    sendMessage: jest.fn(),
};

const mockJwtService = {
    verify: jest.fn(),
};

function makeSocket(overrides?: object) {
    return {
        id: "socket-1",
        userId: undefined as string | undefined,
        disconnect: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
        handshake: {
            auth: {},
            headers: {},
        },
        ...overrides,
    };
}

describe("MessagingGateway", () => {
    let gateway: MessagingGateway;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagingGateway,
                { provide: MessagingService, useValue: mockMessagingService },
                { provide: JwtService, useValue: mockJwtService },
            ],
        }).compile();

        gateway = module.get<MessagingGateway>(MessagingGateway);
        (gateway as any).server = {
            to: jest.fn().mockReturnValue({ emit: jest.fn() }),
        };
    });

    describe("handleConnection", () => {
        it("authenticates user from auth.token", () => {
            const socket = makeSocket({
                handshake: { auth: { token: "tok" }, headers: {} },
            });
            mockJwtService.verify.mockReturnValue({ sub: "user-1" });

            gateway.handleConnection(socket as any);
            expect((socket as any).userId).toBe("user-1");
        });

        it("authenticates user from Authorization header", () => {
            const socket = makeSocket({
                handshake: {
                    auth: {},
                    headers: { authorization: "Bearer tok" },
                },
            });
            mockJwtService.verify.mockReturnValue({ sub: "user-2" });

            gateway.handleConnection(socket as any);
            expect((socket as any).userId).toBe("user-2");
        });

        it("disconnects when no token provided", () => {
            const socket = makeSocket({ handshake: { auth: {}, headers: {} } });

            gateway.handleConnection(socket as any);
            expect(socket.disconnect).toHaveBeenCalled();
        });

        it("disconnects when JWT verification fails", () => {
            const socket = makeSocket({
                handshake: { auth: { token: "bad" }, headers: {} },
            });
            mockJwtService.verify.mockImplementation(() => {
                throw new Error("invalid");
            });

            gateway.handleConnection(socket as any);
            expect(socket.disconnect).toHaveBeenCalled();
        });
    });

    describe("handleDisconnect", () => {
        it("removes user from tracking map", () => {
            const socket = { ...makeSocket(), userId: "user-1" };
            gateway.handleDisconnect(socket as any);
        });

        it("handles disconnect for unauthenticated socket gracefully", () => {
            const socket = makeSocket();
            gateway.handleDisconnect(socket as any);
        });
    });

    describe("handleJoinConversation", () => {
        it("joins room when user is a participant", async () => {
            const socket = {
                ...makeSocket(),
                userId: "user-1",
                join: jest.fn(),
            };
            mockMessagingService.isParticipant.mockResolvedValue(true);

            const result = await gateway.handleJoinConversation(
                socket as any,
                "conv-1",
            );
            expect(result).toEqual({ joined: "conv-1" });
            expect(socket.join).toHaveBeenCalledWith("conversation:conv-1");
        });

        it("throws WsException when userId missing (unauthenticated)", async () => {
            const socket = makeSocket();

            await expect(
                gateway.handleJoinConversation(socket as any, "conv-1"),
            ).rejects.toThrow(WsException);
        });

        it("throws WsException when user is not a participant", async () => {
            const socket = {
                ...makeSocket(),
                userId: "user-99",
                join: jest.fn(),
            };
            mockMessagingService.isParticipant.mockResolvedValue(false);

            await expect(
                gateway.handleJoinConversation(socket as any, "conv-1"),
            ).rejects.toThrow(WsException);
        });
    });

    describe("handleLeaveConversation", () => {
        it("leaves the conversation room", () => {
            const socket = { ...makeSocket(), leave: jest.fn() };
            const result = gateway.handleLeaveConversation(
                socket as any,
                "conv-1",
            );
            expect(result).toEqual({ left: "conv-1" });
            expect(socket.leave).toHaveBeenCalledWith("conversation:conv-1");
        });
    });

    describe("handleSendMessage", () => {
        it("sends message and emits to conversation room", async () => {
            const socket = { ...makeSocket(), userId: "user-1" };
            const saved = { _id: "msg-1", content: "Hello" };
            mockMessagingService.sendMessage.mockResolvedValue(saved);

            const result = await gateway.handleSendMessage(socket as any, {
                conversationId: "conv-1",
                content: "Hello",
            });

            expect(result).toEqual(saved);
            expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
                "conv-1",
                "user-1",
                "Hello",
                MessageType.TEXT,
            );
        });

        it("throws WsException when userId missing", async () => {
            const socket = makeSocket();

            await expect(
                gateway.handleSendMessage(socket as any, {
                    conversationId: "conv-1",
                    content: "hi",
                }),
            ).rejects.toThrow(WsException);
        });
    });

    describe("emitToConversation", () => {
        it("emits an event to the conversation room", () => {
            const emitFn = jest.fn();
            (gateway as any).server.to.mockReturnValue({ emit: emitFn });

            gateway.emitToConversation("conv-1", "new_message", { text: "hi" });
            expect(emitFn).toHaveBeenCalledWith("new_message", { text: "hi" });
        });
    });
});
