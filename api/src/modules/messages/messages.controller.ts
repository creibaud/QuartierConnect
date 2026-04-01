import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { User } from "src/database/drizzle/schema";
import { CreateChatDto } from "src/modules/messages/dto/create-chat.dto";
import { MessageQueryDto } from "src/modules/messages/dto/message-query.dto";
import { ReportMessageDto } from "src/modules/messages/dto/report-message.dto";
import { SendMessageDto } from "src/modules/messages/dto/send-message.dto";
import { MessagesService } from "src/modules/messages/messages.service";

const CHAT_EXAMPLE = {
    id: "507f1f77bcf86cd799439011",
    participantIds: [
        "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        "7ace8b71-3d2a-5e5b-0d23-55e5735f9g92",
    ],
    name: null,
    createdAt: "2026-03-27T10:00:00.000Z",
};

const MESSAGE_EXAMPLE = {
    id: "507f1f77bcf86cd799439012",
    chatId: "507f1f77bcf86cd799439011",
    senderId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    content: "Bonjour !",
    createdAt: "2026-03-27T10:00:00.000Z",
};

const FORBIDDEN = {
    statusCode: 403,
    message: "Forbidden resource",
    error: "Forbidden",
};

@ApiTags("Messages")
@Controller("chats")
@ApiBearerAuth("access-token")
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) {}

    @Get()
    @ApiOperation({ summary: "Get my chats" })
    @ApiResponse({
        status: 200,
        description: "List of chats",
        schema: { example: [CHAT_EXAMPLE] },
    })
    findMyChats(@CurrentUser() user: User) {
        return this.messagesService.findMyChats(user.id);
    }

    @Post()
    @ApiOperation({ summary: "Create a new chat" })
    @ApiResponse({
        status: 201,
        description: "Chat created",
        schema: { example: CHAT_EXAMPLE },
    })
    @ApiResponse({
        status: 409,
        description: "Direct chat already exists",
        schema: {
            example: {
                statusCode: 409,
                message: "Direct chat already exists",
                error: "Conflict",
            },
        },
    })
    createChat(@CurrentUser() user: User, @Body() dto: CreateChatDto) {
        return this.messagesService.createChat(user.id, dto);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a chat by ID" })
    @ApiResponse({
        status: 200,
        description: "Chat found",
        schema: { example: CHAT_EXAMPLE },
    })
    @ApiResponse({
        status: 403,
        description: "Not a participant",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Chat not found",
        schema: {
            example: {
                statusCode: 404,
                message: "Chat not found",
                error: "Not Found",
            },
        },
    })
    getChat(@Param("id") id: string, @CurrentUser() user: User) {
        return this.messagesService.getChat(id, user.id);
    }

    @Get(":id/messages")
    @ApiOperation({ summary: "Get messages for a chat" })
    @ApiResponse({
        status: 200,
        description: "Paginated messages",
        schema: {
            example: {
                data: [MESSAGE_EXAMPLE],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Not a participant",
        schema: { example: FORBIDDEN },
    })
    getMessages(
        @Param("id") id: string,
        @CurrentUser() user: User,
        @Query() query: MessageQueryDto,
    ) {
        return this.messagesService.getMessages(id, user.id, query);
    }

    @Post(":id/messages")
    @ApiOperation({ summary: "Send a message in a chat" })
    @ApiResponse({
        status: 201,
        description: "Message sent",
        schema: { example: MESSAGE_EXAMPLE },
    })
    @ApiResponse({
        status: 403,
        description: "Not a participant",
        schema: { example: FORBIDDEN },
    })
    sendMessage(
        @Param("id") id: string,
        @CurrentUser() user: User,
        @Body() dto: SendMessageDto,
    ) {
        return this.messagesService.sendMessage(id, user.id, dto);
    }

    @Post(":id/messages/:msgId/report")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Report a message in a chat" })
    @ApiResponse({
        status: 200,
        description: "Report submitted",
        schema: {
            example: { message: "Report submitted successfully", reportCount: 2 },
        },
    })
    @ApiResponse({
        status: 400,
        description: "Already reported this message",
        schema: {
            example: {
                statusCode: 400,
                message: "You have already reported this message",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Not a participant",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Message not found",
        schema: {
            example: { statusCode: 404, message: "Message not found", error: "Not Found" },
        },
    })
    reportMessage(
        @Param("id") chatId: string,
        @Param("msgId") msgId: string,
        @CurrentUser() user: User,
        @Body() dto: ReportMessageDto,
    ) {
        return this.messagesService.reportMessage(chatId, msgId, user.id, dto);
    }

    @Delete(":id/messages/:msgId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a message" })
    @ApiResponse({ status: 204, description: "Message deleted" })
    @ApiResponse({
        status: 403,
        description: "Cannot delete this message",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Message not found",
        schema: {
            example: {
                statusCode: 404,
                message: "Message not found",
                error: "Not Found",
            },
        },
    })
    deleteMessage(@Param("msgId") msgId: string, @CurrentUser() user: User) {
        return this.messagesService.deleteMessage(msgId, user.id, user.role);
    }
}
