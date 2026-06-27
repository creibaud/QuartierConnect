import {
    BadRequestException,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Request,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
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
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DocumentsService } from "./documents.service";
import {
    DocumentAuditEntryDto,
    DocumentMetaDto,
    DocumentUploadBodyDto,
} from "./dto/document-responses.dto";

interface AuthRequest {
    user: { sub: string; role: string };
}

@ApiTags("Documents")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("documents")
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @Get("me")
    @ApiOperation({
        summary: "List my documents",
        description:
            "Returns the metadata of all documents uploaded by the user.",
    })
    @ApiResponse({ status: 200, type: [DocumentMetaDto] })
    getMyDocuments(@Request() req: AuthRequest) {
        return this.documentsService.getMyDocuments(req.user.sub);
    }

    @Post("upload")
    @ApiOperation({
        summary: "Upload a document (stored in GridFS, max 20 MB)",
        description:
            "Stores the file in MongoDB GridFS and creates an UPLOAD audit entry. Optionally linked to a neighborhood via `neighborhoodId`.",
    })
    @ApiConsumes("multipart/form-data")
    @ApiBody({ type: DocumentUploadBodyDto })
    @ApiQuery({
        name: "neighborhoodId",
        required: false,
        description: "MongoDB ID of the associated neighborhood",
    })
    @ApiResponse({ status: 201, type: DocumentMetaDto })
    @UseInterceptors(
        FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }),
    )
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Request() req: AuthRequest,
        @Query("neighborhoodId") neighborhoodId?: string,
    ) {
        if (!file) throw new BadRequestException("No file provided");
        return this.documentsService.upload(file, req.user.sub, neighborhoodId);
    }

    @Get(":id/download")
    @ApiOperation({
        summary: "Download a document (GridFS streaming)",
        description:
            "Returns the file as a stream with Content-Disposition: attachment. Creates a DOWNLOAD audit entry.",
    })
    @ApiParam({
        name: "id",
        description: "GridFS FileId (hexadecimal ObjectId)",
    })
    @ApiResponse({
        status: 200,
        description:
            "Binary stream of the file with appropriate Content-Type and Content-Disposition",
    })
    @ApiResponse({
        status: 404,
        description: "File not found or access denied",
    })
    async download(
        @Param("id") id: string,
        @Request() req: AuthRequest,
        @Res() res: Response,
    ) {
        const { stream, fileName, contentType } =
            await this.documentsService.getFileStream(id, req.user.sub);

        res.set({
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        });

        stream.pipe(res);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Delete a document (audit + GridFS delete)",
        description:
            "Deletes the file from GridFS and adds a DELETE audit entry. Only the owner or an admin can delete.",
    })
    @ApiParam({
        name: "id",
        description: "GridFS FileId (hexadecimal ObjectId)",
    })
    @ApiResponse({
        status: 200,
        schema: { example: { success: true } },
        description: "Document deleted",
    })
    @ApiResponse({
        status: 403,
        description: "Access denied (owner or admin required)",
    })
    remove(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.documentsService.softDelete(
            id,
            req.user.sub,
            req.user.role,
        );
    }

    @Get(":id/audit")
    @UseGuards(RolesGuard)
    @Roles("moderator", "admin")
    @ApiOperation({
        summary: "Audit log of a file (append-only)",
        description:
            "Returns all audit entries for a file: UPLOAD, DOWNLOAD, DELETE, ACCESS. Protected for moderator/admin.",
    })
    @ApiParam({
        name: "id",
        description: "GridFS FileId (hexadecimal ObjectId)",
    })
    @ApiResponse({ status: 200, type: [DocumentAuditEntryDto] })
    getAuditLog(@Param("id") id: string) {
        return this.documentsService.getAuditLog(id);
    }
}
