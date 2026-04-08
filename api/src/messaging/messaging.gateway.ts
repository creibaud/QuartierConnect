import { Logger } from "@nestjs/common";
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
import { Server, Socket } from "socket.io";
import { MessagingService } from "./messaging.service";
import { MessageType } from "./schemas/message.schema";

interface AuthSocket extends Socket {
    userId: string;
}

@WebSocketGateway({
    namespace: "/messaging",
    cors: { origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" },
})
export class MessagingGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(MessagingGateway.name);
    private readonly userSockets = new Map<string, string>();

    constructor(
        private readonly messagingService: MessagingService,
        private readonly jwtService: JwtService,
    ) {}

    handleConnection(client: Socket) {
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

            const payload = this.jwtService.verify<{ sub: string }>(token);
            (client as AuthSocket).userId = payload.sub;
            this.userSockets.set(payload.sub, client.id);
            this.logger.log(`User ${payload.sub} connected`);
        } catch {
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = (client as AuthSocket).userId;
        if (userId) {
            this.userSockets.delete(userId);
            this.logger.log(`User ${userId} disconnected`);
        }
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

    emitToConversation(conversationId: string, event: string, data: unknown) {
        this.server.to(`conversation:${conversationId}`).emit(event, data);
    }
}
