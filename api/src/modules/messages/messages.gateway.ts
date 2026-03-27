import { Logger } from "@nestjs/common";
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: { origin: "*" }, namespace: "/chat" })
export class MessagesGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(MessagesGateway.name);

    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.server.emit("userOffline", { clientId: client.id });
    }

    @SubscribeMessage("joinChat")
    handleJoinChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { chatId: string },
    ) {
        client.join(data.chatId);
        this.logger.log(`Client ${client.id} joined chat ${data.chatId}`);
    }

    @SubscribeMessage("leaveChat")
    handleLeaveChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { chatId: string },
    ) {
        client.leave(data.chatId);
        this.logger.log(`Client ${client.id} left chat ${data.chatId}`);
    }

    @SubscribeMessage("sendMessage")
    handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { chatId: string; content: string; userId: string },
    ) {
        client.to(data.chatId).emit("newMessage", data);
    }

    @SubscribeMessage("typing")
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { chatId: string; userId: string },
    ) {
        client.to(data.chatId).emit("typing", data);
    }

    broadcastMessage(chatId: string, message: unknown) {
        this.server.to(chatId).emit("newMessage", message);
    }
}
