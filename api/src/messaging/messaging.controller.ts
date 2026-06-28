import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
    Request,
    Res,
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
import { Response } from "express";
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

    @Get("files/:fileId")
    @ApiOperation({
        summary: "Download a conversation file (GridFS)",
        description:
            "Streams a file stored in GridFS. Only participants of the file's conversation may access it.",
    })
    @ApiParam({ name: "fileId", description: "GridFS file id" })
    @ApiResponse({ status: 200, description: "Binary file stream" })
    @ApiResponse({ status: 403, description: "Not a participant" })
    @ApiResponse({ status: 404, description: "File not found" })
    async getFile(
        @Param("fileId") fileId: string,
        @Request() req: AuthRequest,
        @Res() res: Response,
    ) {
        if (!ObjectId.isValid(fileId)) {
            throw new BadRequestException("Invalid file id");
        }

        const objectId = new ObjectId(fileId);
        const [file] = await this.bucket.find({ _id: objectId }).toArray();
        if (!file) throw new NotFoundException("File not found");

        const conversationId = file.metadata?.conversationId as
            | string
            | undefined;
        if (!conversationId) throw new NotFoundException("File not found");
        await this.messagingService.assertParticipant(
            conversationId,
            req.user.sub,
        );

        const contentType =
            (file.metadata?.contentType as string | undefined) ??
            "application/octet-stream";
        const safeName = file.filename.replace(/[\r\n"]/g, "");
        res.set({
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${safeName}"`,
        });
        this.bucket.openDownloadStream(objectId).pipe(res);
    }
}
