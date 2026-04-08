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
    @ApiOperation({ summary: "Lister mes documents" })
    getMyDocuments(@Request() req: AuthRequest) {
        return this.documentsService.getMyDocuments(req.user.sub);
    }

    @Post("upload")
    @ApiOperation({ summary: "Uploader un document (stocké dans GridFS)" })
    @ApiConsumes("multipart/form-data")
    @ApiQuery({ name: "neighborhoodId", required: false })
    @ApiResponse({ status: 201, description: "Document uploadé" })
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
    @ApiOperation({ summary: "Télécharger un document (streaming GridFS)" })
    @ApiParam({ name: "id", description: "FileId GridFS" })
    @ApiResponse({ status: 200, description: "Fichier en streaming" })
    @ApiResponse({ status: 404, description: "Fichier introuvable" })
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
    @ApiOperation({ summary: "Supprimer un document (audit + delete GridFS)" })
    @ApiParam({ name: "id", description: "FileId GridFS" })
    @ApiResponse({ status: 200, description: "{ success: true }" })
    @ApiResponse({ status: 403, description: "Accès refusé" })
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
    @ApiOperation({ summary: "Journal d'audit du fichier (append-only)" })
    @ApiParam({ name: "id", description: "FileId GridFS" })
    getAuditLog(@Param("id") id: string) {
        return this.documentsService.getAuditLog(id);
    }
}
