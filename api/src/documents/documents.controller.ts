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
        summary: "Lister mes documents",
        description:
            "Retourne les métadonnées de tous les documents uploadés par l'utilisateur.",
    })
    @ApiResponse({ status: 200, type: [DocumentMetaDto] })
    getMyDocuments(@Request() req: AuthRequest) {
        return this.documentsService.getMyDocuments(req.user.sub);
    }

    @Post("upload")
    @ApiOperation({
        summary: "Uploader un document (stocké dans GridFS, max 20 Mo)",
        description:
            "Stocke le fichier dans MongoDB GridFS et crée une entrée d'audit UPLOAD. Optionnellement lié à un quartier via `neighborhoodId`.",
    })
    @ApiConsumes("multipart/form-data")
    @ApiBody({ type: DocumentUploadBodyDto })
    @ApiQuery({
        name: "neighborhoodId",
        required: false,
        description: "ID MongoDB du quartier associé",
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
        summary: "Télécharger un document (streaming GridFS)",
        description:
            "Retourne le fichier en streaming avec Content-Disposition: attachment. Crée une entrée d'audit DOWNLOAD.",
    })
    @ApiParam({
        name: "id",
        description: "FileId GridFS (ObjectId hexadécimal)",
    })
    @ApiResponse({
        status: 200,
        description:
            "Flux binaire du fichier avec Content-Type et Content-Disposition appropriés",
    })
    @ApiResponse({
        status: 404,
        description: "Fichier introuvable ou accès refusé",
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
        summary: "Supprimer un document (audit + delete GridFS)",
        description:
            "Supprime le fichier de GridFS et ajoute une entrée d'audit DELETE. Seul le propriétaire ou un admin peut supprimer.",
    })
    @ApiParam({
        name: "id",
        description: "FileId GridFS (ObjectId hexadécimal)",
    })
    @ApiResponse({
        status: 200,
        schema: { example: { success: true } },
        description: "Document supprimé",
    })
    @ApiResponse({
        status: 403,
        description: "Accès refusé (propriétaire ou admin requis)",
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
        summary: "Journal d'audit d'un fichier (append-only)",
        description:
            "Retourne toutes les entrées d'audit pour un fichier : UPLOAD, DOWNLOAD, DELETE, ACCESS. Protégé moderator/admin.",
    })
    @ApiParam({
        name: "id",
        description: "FileId GridFS (ObjectId hexadécimal)",
    })
    @ApiResponse({ status: 200, type: [DocumentAuditEntryDto] })
    getAuditLog(@Param("id") id: string) {
        return this.documentsService.getAuditLog(id);
    }
}
