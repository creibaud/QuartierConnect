import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { FileInterceptor } from "@nestjs/platform-express";
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { GridFSBucket, ObjectId } from "mongodb";
import { Connection } from "mongoose";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import {
    ConversationDto,
    FileUploadBodyDto,
    MessageDto,
} from "./dto/messaging-responses.dto";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";
import { MessageType } from "./schemas/message.schema";

interface AuthRequest {
    user: { sub: string };
}

@ApiTags("Messaging")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("messaging")
export class MessagingController {
    private bucket: GridFSBucket;

    constructor(
        private readonly messagingService: MessagingService,
        private readonly gateway: MessagingGateway,
        @InjectConnection() private readonly connection: Connection,
    ) {
        this.bucket = new GridFSBucket(this.connection.db as any, {
            bucketName: "messaging_files",
        });
    }

    @Get("conversations")
    @ApiOperation({
        summary: "List my conversations",
        description:
            "Returns all conversations where the user is a participant.",
    })
    @ApiResponse({ status: 200, type: [ConversationDto] })
    findConversations(@Request() req: AuthRequest) {
        return this.messagingService.findConversations(req.user.sub);
    }

    @Post("conversations")
    @ApiOperation({
        summary: "Create a conversation",
        description:
            "Creates a one-to-one or group conversation. For a one-to-one conversation, `participants` = [otherUserId].",
    })
    @ApiResponse({ status: 201, type: ConversationDto })
    createConversation(
        @Body() dto: CreateConversationDto,
        @Request() req: AuthRequest,
    ) {
        return this.messagingService.createConversation(dto, req.user.sub);
    }

    @Get("conversations/:id/messages")
    @ApiOperation({
        summary: "Message history (paginated)",
        description: "Messages sorted from newest to oldest.",
    })
    @ApiParam({ name: "id", description: "MongoDB ID of the conversation" })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "50" })
    @ApiResponse({ status: 200, type: [MessageDto] })
    getMessages(
        @Param("id") id: string,
        @Request() req: AuthRequest,
        @Query("page") page = "1",
        @Query("limit") limit = "50",
    ) {
        return this.messagingService.getMessages(
            id,
            req.user.sub,
            parseInt(page),
            parseInt(limit),
        );
    }

    @Post("conversations/:id/upload")
    @ApiOperation({
        summary: "Send a file in a conversation (GridFS)",
        description:
            "Uploads a file (max 10 MB). Creates a message of type FILE or IMAGE depending on the MIME type. The file is accessible via its GridFS fileId.",
    })
    @ApiConsumes("multipart/form-data")
    @ApiBody({ type: FileUploadBodyDto })
    @ApiParam({ name: "id", description: "MongoDB ID of the conversation" })
    @ApiResponse({ status: 201, type: MessageDto })
    @UseInterceptors(
        FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
    )
    async uploadFile(
        @Param("id") conversationId: string,
        @UploadedFile() file: Express.Multer.File,
        @Request() req: AuthRequest,
    ) {
        if (!file) throw new BadRequestException("No file provided");

        const fileId = new ObjectId();
        await new Promise<void>((resolve) => {
            const stream = this.bucket.openUploadStreamWithId(
                fileId,
                file.originalname,
                {
                    metadata: {
                        uploadedBy: req.user.sub,
                        conversationId,
                        contentType: file.mimetype,
                    },
                },
            );
            stream.end(file.buffer, () => resolve());
        });

        const isImage = file.mimetype.startsWith("image/");
        const message = await this.messagingService.sendFileMessage(
            conversationId,
            req.user.sub,
            fileId.toHexString(),
            file.originalname,
            isImage ? MessageType.IMAGE : MessageType.FILE,
        );

        this.gateway.emitToConversation(conversationId, "new_message", message);
        return message;
    }
}
