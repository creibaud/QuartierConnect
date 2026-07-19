import { Inject, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from "@nestjs/websockets";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Server, Socket } from "socket.io";
import { JwtPayload, TokenService } from "../auth/token.service";
import {
    NotificationPayload,
    NotificationType,
} from "../common/notification-events";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { MessagingService } from "./messaging.service";
import { MessageType } from "./schemas/message.schema";

interface AuthSocket extends Socket {
    userId: string;
    // Resolves once the socket is authenticated; handlers await it before reading userId.
    authReady?: Promise<void>;
}

const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000", "http://localhost:3001"];

const MAX_MESSAGE_CONTENT_LENGTH = 4000;

@WebSocketGateway({
    namespace: "/messaging",
    cors: { origin: corsOrigins, credentials: true },
})
export class MessagingGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(MessagingGateway.name);

    private readonly socketsByUser = new Map<string, Set<string>>();
    private readonly conversationPeersByUser = new Map<string, Set<string>>();

    constructor(
        private readonly messagingService: MessagingService,
        private readonly jwtService: JwtService,
        private readonly tokenService: TokenService,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    async handleConnection(client: Socket) {
        // Store the auth promise synchronously so early messages can await it.
        const ready = this.authenticateAndSetup(client);
        (client as AuthSocket).authReady = ready;
        await ready;
    }

    private async authenticateAndSetup(client: Socket): Promise<void> {
        try {
            const token =
                (client.handshake.auth as Record<string, string>)?.token ||
                (client.handshake.headers?.authorization as string)?.replace(
                    "Bearer ",
                    "",
                );

            if (!token) {
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify<JwtPayload>(token);
            if (!payload?.sub || !(await this.isTokenStillValid(payload))) {
                client.disconnect();
                return;
            }

            const userId = payload.sub;
            (client as AuthSocket).userId = userId;
            void client.join(`user:${userId}`);

            const conversations =
                await this.messagingService.findConversations(userId);
            for (const conv of conversations) {
                void client.join(`conversation:${String(conv._id)}`);
            }

            const peers = this.collectConversationPeers(userId, conversations);
            this.conversationPeersByUser.set(userId, peers);

            const cameOnline = this.registerSocket(userId, client.id);
            client.emit("presence:snapshot", {
                onlineUserIds: [...peers].filter((peerId) =>
                    this.socketsByUser.has(peerId),
                ),
            });
            if (cameOnline) this.emitPresenceUpdate(userId, true);

            this.logger.log(`User ${userId} connected`);
        } catch {
            client.disconnect();
        }
    }

    private async requireUserId(client: Socket): Promise<string> {
        const ready = (client as AuthSocket).authReady;
        if (ready) await ready;
        const userId = (client as AuthSocket).userId;
        if (!userId) throw new WsException("Unauthorized");
        return userId;
    }

    // Reject a socket whose token was revoked or whose account is banned/deleted.
    private async isTokenStillValid(payload: JwtPayload): Promise<boolean> {
        if (
            payload.jti &&
            (await this.tokenService.isAccessTokenRevoked(payload.jti))
        ) {
            return false;
        }

        const [user] = await this.db
            .select({ role: schema.users.role })
            .from(schema.users)
            .where(eq(schema.users.id, payload.sub))
            .limit(1);

        return !!user && user.role !== "banned" && user.role !== "deleted";
    }

    handleDisconnect(client: Socket) {
        const userId = (client as AuthSocket).userId;
        if (!userId) return;

        const sockets = this.socketsByUser.get(userId);
        if (!sockets?.delete(client.id)) return;
        if (sockets.size > 0) return;

        this.socketsByUser.delete(userId);
        this.emitPresenceUpdate(userId, false);
        this.conversationPeersByUser.delete(userId);
        this.logger.log(`User ${userId} disconnected`);
    }

    @SubscribeMessage("join_conversation")
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string,
    ) {
        const userId = await this.requireUserId(client);

        const isParticipant = await this.messagingService.isParticipant(
            conversationId,
            userId,
        );
        if (!isParticipant) throw new WsException("Not a participant");

        void client.join(`conversation:${conversationId}`);
        return { joined: conversationId };
    }

    @SubscribeMessage("leave_conversation")
    handleLeaveConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string,
    ) {
        void client.leave(`conversation:${conversationId}`);
        return { left: conversationId };
    }

    @SubscribeMessage("send_message")
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { conversationId?: unknown; content?: unknown },
    ) {
        const userId = await this.requireUserId(client);
        const { conversationId, content } = this.validateSendMessage(data);

        const message = await this.messagingService.sendMessage(
            conversationId,
            userId,
            content,
            MessageType.TEXT,
        );

        this.server
            .to(`conversation:${conversationId}`)
            .emit("new_message", message);

        return message;
    }

    // WS payloads bypass the HTTP ValidationPipe, so validate the shape here.
    private validateSendMessage(
        data: { conversationId?: unknown; content?: unknown } | undefined,
    ): { conversationId: string; content: string } {
        if (
            typeof data?.conversationId !== "string" ||
            data.conversationId.length === 0
        ) {
            throw new WsException("conversationId is required");
        }
        if (typeof data.content !== "string") {
            throw new WsException("content must be a string");
        }
        const content = data.content.trim();
        if (content.length === 0) {
            throw new WsException("content must not be empty");
        }
        if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
            throw new WsException(
                `content must not exceed ${MAX_MESSAGE_CONTENT_LENGTH} characters`,
            );
        }
        return { conversationId: data.conversationId, content };
    }

    @SubscribeMessage("typing:start")
    async handleTypingStart(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ) {
        await this.relayTypingUpdate(client, data?.conversationId, true);
    }

    @SubscribeMessage("typing:stop")
    async handleTypingStop(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ) {
        await this.relayTypingUpdate(client, data?.conversationId, false);
    }

    emitToConversation(conversationId: string, event: string, data: unknown) {
        this.server.to(`conversation:${conversationId}`).emit(event, data);
    }

    /**
     * Conversation rooms are joined once, at handshake time, so a conversation
     * created afterwards is missing from every participant already connected.
     * Their live sockets are added here; without it the first message is
     * broadcast to a room nobody is in and only a reload reveals it.
     */
    joinParticipantsToConversation(
        conversationId: string,
        participantIds: string[],
    ): void {
        if (!this.server || participantIds.length === 0) return;
        const uniqueIds = [...new Set(participantIds)].filter(Boolean);
        if (uniqueIds.length === 0) return;
        void this.server
            .in(uniqueIds.map((userId) => `user:${userId}`))
            .socketsJoin(`conversation:${conversationId}`);
        this.registerConversationPeers(uniqueIds);
    }

    /**
     * Peers are collected at handshake too, so without this both sides stay
     * blind to each other's presence on a conversation created afterwards:
     * the badge never lights up, and a later disconnect is never announced,
     * leaving the other side with a dot that is stuck on.
     */
    private registerConversationPeers(participantIds: string[]): void {
        for (const userId of participantIds) {
            const peers = this.conversationPeersByUser.get(userId);
            // No entry means offline; handleConnection will collect the peers.
            if (!peers) continue;
            for (const peerId of participantIds) {
                if (peerId === userId || peers.has(peerId)) continue;
                peers.add(peerId);
                if (!this.socketsByUser.has(peerId)) continue;
                this.server
                    .to(`user:${userId}`)
                    .emit("presence:update", { userId: peerId, online: true });
            }
        }
    }

    sendNotification(
        userIds: string[],
        type: NotificationType,
        payload: NotificationPayload,
    ) {
        const rooms = [...new Set(userIds)]
            .filter((userId) => Boolean(userId))
            .map((userId) => `user:${userId}`);
        if (!this.server || rooms.length === 0) return;
        this.server.to(rooms).emit("notification", { type, payload });
    }

    private async relayTypingUpdate(
        client: Socket,
        conversationId: string | undefined,
        typing: boolean,
    ) {
        const userId = await this.requireUserId(client);
        if (!conversationId) {
            throw new WsException("conversationId is required");
        }

        const room = `conversation:${conversationId}`;
        if (!client.rooms.has(room)) {
            const isParticipant = await this.messagingService.isParticipant(
                conversationId,
                userId,
            );
            if (!isParticipant) throw new WsException("Not a participant");
        }

        client
            .to(room)
            .emit("typing:update", { conversationId, userId, typing });
    }

    private registerSocket(userId: string, socketId: string): boolean {
        const sockets = this.socketsByUser.get(userId);
        if (sockets) {
            sockets.add(socketId);
            return false;
        }
        this.socketsByUser.set(userId, new Set([socketId]));
        return true;
    }

    private collectConversationPeers(
        userId: string,
        conversations: Array<{ participants?: string[] }>,
    ): Set<string> {
        const peers = new Set<string>();
        for (const conversation of conversations) {
            for (const participantId of conversation.participants ?? []) {
                if (participantId !== userId) peers.add(participantId);
            }
        }
        return peers;
    }

    private emitPresenceUpdate(userId: string, online: boolean) {
        const peers = this.conversationPeersByUser.get(userId);
        if (!peers || peers.size === 0) return;
        this.server
            .to([...peers].map((peerId) => `user:${peerId}`))
            .emit("presence:update", { userId, online });
    }
}
