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
}

const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000", "http://localhost:3001"];

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

    // Mirrors JwtStrategy.validate(): a socket must be rejected if its access
    // token was revoked (logout) or if the account has since been banned/deleted.
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

        return (
            !!user && user.role !== "banned" && user.role !== "deleted"
        );
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
        const userId = (client as AuthSocket).userId;
        if (!userId) throw new WsException("Unauthorized");

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
        data: { conversationId: string; content: string },
    ) {
        const userId = (client as AuthSocket).userId;
        if (!userId) throw new WsException("Unauthorized");

        const message = await this.messagingService.sendMessage(
            data.conversationId,
            userId,
            data.content,
            MessageType.TEXT,
        );

        this.server
            .to(`conversation:${data.conversationId}`)
            .emit("new_message", message);

        return message;
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
        const userId = (client as AuthSocket).userId;
        if (!userId) throw new WsException("Unauthorized");
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
