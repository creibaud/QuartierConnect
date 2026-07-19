import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { WsException } from "@nestjs/websockets";
import { TokenService } from "../auth/token.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";
import { MessageType } from "./schemas/message.schema";

const mockMessagingService = {
    isParticipant: jest.fn(),
    sendMessage: jest.fn(),
    findConversations: jest.fn(),
};

const mockJwtService = {
    verify: jest.fn(),
};

const mockTokenService = {
    isAccessTokenRevoked: jest.fn().mockResolvedValue(false),
};

function makeDb(role = "resident") {
    const db: Record<string, jest.Mock> = {};
    db.select = jest.fn().mockReturnValue(db);
    db.from = jest.fn().mockReturnValue(db);
    db.where = jest.fn().mockReturnValue(db);
    db.limit = jest.fn().mockResolvedValue([{ role }]);
    return db;
}

function makeSocket(overrides?: object) {
    return {
        id: "socket-1",
        userId: undefined as string | undefined,
        disconnect: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
        rooms: new Set<string>(),
        handshake: {
            auth: {},
            headers: {},
        },
        ...overrides,
    };
}

describe("MessagingGateway", () => {
    let gateway: MessagingGateway;
    let serverEmit: jest.Mock;
    let serverTo: jest.Mock;
    let serverIn: jest.Mock;
    let socketsJoin: jest.Mock;

    async function connectUser(
        userId: string,
        conversations: unknown[],
        socketId = `socket-${userId}`,
    ) {
        const socket = makeSocket({
            id: socketId,
            handshake: { auth: { token: "tok" }, headers: {} },
        });
        mockJwtService.verify.mockReturnValueOnce({ sub: userId });
        mockMessagingService.findConversations.mockResolvedValueOnce(
            conversations,
        );
        await gateway.handleConnection(socket as any);
        return socket;
    }

    function conversationWith(participants: string[]) {
        return [{ _id: "conv-1", participants }];
    }

    beforeEach(async () => {
        jest.clearAllMocks();
        mockTokenService.isAccessTokenRevoked.mockResolvedValue(false);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagingGateway,
                { provide: MessagingService, useValue: mockMessagingService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: TokenService, useValue: mockTokenService },
                { provide: DRIZZLE_TOKEN, useValue: makeDb() },
            ],
        }).compile();

        gateway = module.get<MessagingGateway>(MessagingGateway);
        serverEmit = jest.fn();
        serverTo = jest.fn().mockReturnValue({ emit: serverEmit });
        socketsJoin = jest.fn();
        serverIn = jest.fn().mockReturnValue({ socketsJoin });
        (gateway as any).server = { to: serverTo, in: serverIn };
    });

    describe("handleConnection", () => {
        it("authenticates user from auth.token and joins their conversations", async () => {
            const socket = makeSocket({
                handshake: { auth: { token: "tok" }, headers: {} },
            });
            mockJwtService.verify.mockReturnValue({ sub: "user-1" });
            mockMessagingService.findConversations.mockResolvedValue([
                { _id: { toString: () => "conv-1" }, participants: [] },
                { _id: { toString: () => "conv-2" }, participants: [] },
            ]);

            await gateway.handleConnection(socket as any);

            expect((socket as any).userId).toBe("user-1");
            expect(socket.join).toHaveBeenCalledWith("user:user-1");
            expect(socket.join).toHaveBeenCalledWith("conversation:conv-1");
            expect(socket.join).toHaveBeenCalledWith("conversation:conv-2");
        });

        it("authenticates user from Authorization header", async () => {
            const socket = makeSocket({
                handshake: {
                    auth: {},
                    headers: { authorization: "Bearer tok" },
                },
            });
            mockJwtService.verify.mockReturnValue({ sub: "user-2" });
            mockMessagingService.findConversations.mockResolvedValue([]);

            await gateway.handleConnection(socket as any);
            expect((socket as any).userId).toBe("user-2");
        });

        it("disconnects when no token provided", async () => {
            const socket = makeSocket({ handshake: { auth: {}, headers: {} } });

            await gateway.handleConnection(socket as any);
            expect(socket.disconnect).toHaveBeenCalled();
        });

        it("disconnects when JWT verification fails", async () => {
            const socket = makeSocket({
                handshake: { auth: { token: "bad" }, headers: {} },
            });
            mockJwtService.verify.mockImplementation(() => {
                throw new Error("invalid");
            });

            await gateway.handleConnection(socket as any);
            expect(socket.disconnect).toHaveBeenCalled();
        });

        it("disconnects when findConversations throws", async () => {
            const socket = makeSocket({
                handshake: { auth: { token: "tok" }, headers: {} },
            });
            mockJwtService.verify.mockReturnValue({ sub: "user-1" });
            mockMessagingService.findConversations.mockRejectedValue(
                new Error("DB error"),
            );

            await gateway.handleConnection(socket as any);
            expect(socket.disconnect).toHaveBeenCalled();
        });

        it("connects with no conversations without error", async () => {
            const socket = makeSocket({
                handshake: { auth: { token: "tok" }, headers: {} },
            });
            mockJwtService.verify.mockReturnValue({ sub: "user-new" });
            mockMessagingService.findConversations.mockResolvedValue([]);

            await gateway.handleConnection(socket as any);

            expect((socket as any).userId).toBe("user-new");
            expect(socket.join).toHaveBeenCalledTimes(1);
            expect(socket.join).toHaveBeenCalledWith("user:user-new");
            expect(socket.disconnect).not.toHaveBeenCalled();
        });
    });

    describe("presence", () => {
        it("sends a presence snapshot listing the online conversation peers", async () => {
            await connectUser("user-a", conversationWith(["user-a", "user-b"]));
            const socketB = await connectUser(
                "user-b",
                conversationWith(["user-a", "user-b"]),
            );

            expect(socketB.emit).toHaveBeenCalledWith("presence:snapshot", {
                onlineUserIds: ["user-a"],
            });
        });

        it("sends an empty snapshot when no peer is online", async () => {
            const socket = await connectUser(
                "user-a",
                conversationWith(["user-a", "user-b"]),
            );

            expect(socket.emit).toHaveBeenCalledWith("presence:snapshot", {
                onlineUserIds: [],
            });
        });

        it("broadcasts presence:update online to peers on the first socket only", async () => {
            await connectUser(
                "user-a",
                conversationWith(["user-a", "user-b"]),
                "sock-1",
            );

            expect(serverTo).toHaveBeenCalledWith(["user:user-b"]);
            expect(serverEmit).toHaveBeenCalledWith("presence:update", {
                userId: "user-a",
                online: true,
            });

            serverEmit.mockClear();
            await connectUser(
                "user-a",
                conversationWith(["user-a", "user-b"]),
                "sock-2",
            );

            expect(serverEmit).not.toHaveBeenCalled();
        });

        it("broadcasts presence:update offline only when the last socket leaves", async () => {
            const first = await connectUser(
                "user-a",
                conversationWith(["user-a", "user-b"]),
                "sock-1",
            );
            const second = await connectUser(
                "user-a",
                conversationWith(["user-a", "user-b"]),
                "sock-2",
            );
            serverEmit.mockClear();

            gateway.handleDisconnect(first as any);
            expect(serverEmit).not.toHaveBeenCalled();

            gateway.handleDisconnect(second as any);
            expect(serverEmit).toHaveBeenCalledWith("presence:update", {
                userId: "user-a",
                online: false,
            });
        });

        it("emits no presence:update when the user has no conversation peer", async () => {
            const socket = await connectUser("user-solo", []);

            expect(serverEmit).not.toHaveBeenCalled();

            gateway.handleDisconnect(socket as any);
            expect(serverEmit).not.toHaveBeenCalled();
        });
    });

    describe("handleDisconnect", () => {
        it("handles disconnect for authenticated socket", () => {
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

        it("trims the content before persisting", async () => {
            const socket = { ...makeSocket(), userId: "user-1" };
            mockMessagingService.sendMessage.mockResolvedValue({
                _id: "msg-1",
            });

            await gateway.handleSendMessage(socket as any, {
                conversationId: "conv-1",
                content: "  hi  ",
            });

            expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
                "conv-1",
                "user-1",
                "hi",
                MessageType.TEXT,
            );
        });

        it("rejects a missing conversationId", async () => {
            const socket = { ...makeSocket(), userId: "user-1" };

            await expect(
                gateway.handleSendMessage(socket as any, { content: "hi" }),
            ).rejects.toThrow(WsException);
            expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
        });

        it("rejects a non-string content", async () => {
            const socket = { ...makeSocket(), userId: "user-1" };

            await expect(
                gateway.handleSendMessage(socket as any, {
                    conversationId: "conv-1",
                    content: 42,
                }),
            ).rejects.toThrow(WsException);
            expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
        });

        it("rejects an empty or whitespace-only content", async () => {
            const socket = { ...makeSocket(), userId: "user-1" };

            await expect(
                gateway.handleSendMessage(socket as any, {
                    conversationId: "conv-1",
                    content: "   ",
                }),
            ).rejects.toThrow(WsException);
            expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
        });

        it("rejects a content longer than 4000 characters", async () => {
            const socket = { ...makeSocket(), userId: "user-1" };

            await expect(
                gateway.handleSendMessage(socket as any, {
                    conversationId: "conv-1",
                    content: "a".repeat(4001),
                }),
            ).rejects.toThrow(WsException);
            expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe("typing", () => {
        it("relays typing:start to the other participants of a joined room", async () => {
            const roomEmit = jest.fn();
            const socket = makeSocket({
                userId: "user-1",
                rooms: new Set(["conversation:conv-1"]),
                to: jest.fn().mockReturnValue({ emit: roomEmit }),
            });

            await gateway.handleTypingStart(socket as any, {
                conversationId: "conv-1",
            });

            expect(socket.to).toHaveBeenCalledWith("conversation:conv-1");
            expect(roomEmit).toHaveBeenCalledWith("typing:update", {
                conversationId: "conv-1",
                userId: "user-1",
                typing: true,
            });
            expect(mockMessagingService.isParticipant).not.toHaveBeenCalled();
        });

        it("relays typing:stop with typing=false", async () => {
            const roomEmit = jest.fn();
            const socket = makeSocket({
                userId: "user-1",
                rooms: new Set(["conversation:conv-1"]),
                to: jest.fn().mockReturnValue({ emit: roomEmit }),
            });

            await gateway.handleTypingStop(socket as any, {
                conversationId: "conv-1",
            });

            expect(roomEmit).toHaveBeenCalledWith("typing:update", {
                conversationId: "conv-1",
                userId: "user-1",
                typing: false,
            });
        });

        it("verifies participation when the socket has not joined the room", async () => {
            const roomEmit = jest.fn();
            const socket = makeSocket({
                userId: "user-1",
                to: jest.fn().mockReturnValue({ emit: roomEmit }),
            });
            mockMessagingService.isParticipant.mockResolvedValue(true);

            await gateway.handleTypingStart(socket as any, {
                conversationId: "conv-9",
            });

            expect(mockMessagingService.isParticipant).toHaveBeenCalledWith(
                "conv-9",
                "user-1",
            );
            expect(roomEmit).toHaveBeenCalledWith(
                "typing:update",
                expect.objectContaining({ typing: true }),
            );
        });

        it("rejects typing from a non-participant", async () => {
            const socket = makeSocket({ userId: "user-1" });
            mockMessagingService.isParticipant.mockResolvedValue(false);

            await expect(
                gateway.handleTypingStart(socket as any, {
                    conversationId: "conv-9",
                }),
            ).rejects.toThrow(WsException);
        });

        it("rejects typing from an unauthenticated socket", async () => {
            const socket = makeSocket();

            await expect(
                gateway.handleTypingStop(socket as any, {
                    conversationId: "conv-1",
                }),
            ).rejects.toThrow(WsException);
        });

        it("rejects typing without a conversationId", async () => {
            const socket = makeSocket({ userId: "user-1" });

            await expect(
                gateway.handleTypingStart(socket as any, {} as any),
            ).rejects.toThrow(WsException);
        });
    });

    describe("sendNotification", () => {
        it("emits a notification to the user room of every recipient", () => {
            gateway.sendNotification(["u1", "u2"], "booking.created", {
                bookingId: "b1",
            });

            expect(serverTo).toHaveBeenCalledWith(["user:u1", "user:u2"]);
            expect(serverEmit).toHaveBeenCalledWith("notification", {
                type: "booking.created",
                payload: { bookingId: "b1" },
            });
        });

        it("deduplicates recipients and drops empty ids", () => {
            gateway.sendNotification(["u1", "u1", ""], "points.settled", {
                amount: 3,
            });

            expect(serverTo).toHaveBeenCalledWith(["user:u1"]);
        });

        it("does nothing without recipients", () => {
            gateway.sendNotification([], "points.settled", {});

            expect(serverTo).not.toHaveBeenCalled();
        });
    });

    describe("emitToConversation", () => {
        it("emits an event to the conversation room", () => {
            gateway.emitToConversation("conv-1", "new_message", { text: "hi" });

            expect(serverTo).toHaveBeenCalledWith("conversation:conv-1");
            expect(serverEmit).toHaveBeenCalledWith("new_message", {
                text: "hi",
            });
        });
    });

    describe("joinParticipantsToConversation", () => {
        it("adds every participant's live sockets to the new room", () => {
            gateway.joinParticipantsToConversation("conv-9", [
                "user-1",
                "user-2",
            ]);

            expect(serverIn).toHaveBeenCalledWith([
                "user:user-1",
                "user:user-2",
            ]);
            expect(socketsJoin).toHaveBeenCalledWith("conversation:conv-9");
        });

        it("targets each participant once", () => {
            gateway.joinParticipantsToConversation("conv-9", [
                "user-1",
                "user-1",
            ]);

            expect(serverIn).toHaveBeenCalledWith(["user:user-1"]);
        });

        it("does nothing without participants", () => {
            gateway.joinParticipantsToConversation("conv-9", []);

            expect(serverIn).not.toHaveBeenCalled();
        });
    });

    describe("a conversation created after connection", () => {
        it("delivers the first message to a participant who was already online", async () => {
            const socket = await connectUser("user-2", []);
            expect(socket.join).not.toHaveBeenCalledWith(
                "conversation:conv-new",
            );

            // What the REST creation endpoint does once the conversation exists.
            gateway.joinParticipantsToConversation("conv-new", [
                "user-1",
                "user-2",
            ]);

            expect(serverIn).toHaveBeenCalledWith([
                "user:user-1",
                "user:user-2",
            ]);
            expect(socketsJoin).toHaveBeenCalledWith("conversation:conv-new");
        });

        it("lights up the presence badge for a peer who is already online", async () => {
            await connectUser("user-1", [], "socket-1");
            await connectUser("user-2", [], "socket-2");
            serverTo.mockClear();
            serverEmit.mockClear();

            gateway.joinParticipantsToConversation("conv-new", [
                "user-1",
                "user-2",
            ]);

            expect(serverTo).toHaveBeenCalledWith("user:user-1");
            expect(serverEmit).toHaveBeenCalledWith("presence:update", {
                userId: "user-2",
                online: true,
            });
            expect(serverTo).toHaveBeenCalledWith("user:user-2");
            expect(serverEmit).toHaveBeenCalledWith("presence:update", {
                userId: "user-1",
                online: true,
            });
        });

        it("stays quiet about a peer who is offline", async () => {
            await connectUser("user-1", [], "socket-1");
            serverEmit.mockClear();

            gateway.joinParticipantsToConversation("conv-new", [
                "user-1",
                "user-2",
            ]);

            expect(serverEmit).not.toHaveBeenCalledWith(
                "presence:update",
                expect.anything(),
            );
        });

        it("announces the disconnect of someone met after connection", async () => {
            const socket = await connectUser("user-1", [], "socket-1");
            await connectUser("user-2", [], "socket-2");
            gateway.joinParticipantsToConversation("conv-new", [
                "user-1",
                "user-2",
            ]);
            serverTo.mockClear();
            serverEmit.mockClear();

            gateway.handleDisconnect(socket as any);

            expect(serverTo).toHaveBeenCalledWith(["user:user-2"]);
            expect(serverEmit).toHaveBeenCalledWith("presence:update", {
                userId: "user-1",
                online: false,
            });
        });
    });
});
