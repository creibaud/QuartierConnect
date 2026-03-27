import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import type { User } from "src/database/drizzle/schema";
import { DocumentsService } from "src/modules/documents/documents.service";
import { AddSignatureZoneDto } from "src/modules/documents/dto/add-signature-zone.dto";
import { CreateDocumentDto } from "src/modules/documents/dto/create-document.dto";
import { InviteSignerDto } from "src/modules/documents/dto/invite-signer.dto";
import { SignDocumentDto } from "src/modules/documents/dto/sign-document.dto";

const DOCUMENT_EXAMPLE = {
    id: "507f1f77bcf86cd799439011",
    title: "Contrat de service",
    creatorId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    status: "draft",
    signerIds: [],
    signatureZones: [],
    auditTrail: [],
    createdAt: "2026-03-27T10:00:00.000Z",
};

const NOT_AUTHORIZED = {
    statusCode: 403,
    message: "Not authorized",
    error: "Forbidden",
};

const NOT_FOUND = {
    statusCode: 404,
    message: "Document not found",
    error: "Not Found",
};

@ApiTags("Documents")
@Controller("documents")
@ApiBearerAuth("access-token")
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @Post()
    @ApiOperation({ summary: "Create a new document" })
    @ApiResponse({
        status: 201,
        description: "Document created",
        schema: { example: DOCUMENT_EXAMPLE },
    })
    create(@CurrentUser() user: User, @Body() dto: CreateDocumentDto) {
        return this.documentsService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: "List my documents" })
    @ApiResponse({
        status: 200,
        description: "Paginated document list",
        schema: {
            example: {
                data: [DOCUMENT_EXAMPLE],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    findMyDocuments(
        @CurrentUser() user: User,
        @Query() query: PaginationQueryDto,
    ) {
        return this.documentsService.findMyDocuments(user.id, query);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a document by ID" })
    @ApiResponse({
        status: 200,
        description: "Document found",
        schema: { example: DOCUMENT_EXAMPLE },
    })
    @ApiResponse({
        status: 403,
        description: "Not authorized",
        schema: { example: NOT_AUTHORIZED },
    })
    @ApiResponse({
        status: 404,
        description: "Document not found",
        schema: { example: NOT_FOUND },
    })
    findOne(@Param("id") id: string, @CurrentUser() user: User) {
        return this.documentsService.findOne(id, user.id);
    }

    @Post(":id/zones")
    @ApiOperation({ summary: "Add a signature zone to a document" })
    @ApiResponse({
        status: 201,
        description: "Signature zone added",
        schema: {
            example: {
                ...DOCUMENT_EXAMPLE,
                signatureZones: [
                    {
                        id: "zone-uuid-1",
                        signerId: "7ace8b71-3d2a-5e5b-0d23-55e5735f9g92",
                        page: 1,
                        x: 100,
                        y: 200,
                    },
                ],
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Only the creator can add zones",
        schema: { example: NOT_AUTHORIZED },
    })
    addSignatureZone(
        @Param("id") id: string,
        @CurrentUser() user: User,
        @Body() dto: AddSignatureZoneDto,
    ) {
        return this.documentsService.addSignatureZone(id, user.id, dto);
    }

    @Post(":id/invite")
    @ApiOperation({ summary: "Invite a signer to a document" })
    @ApiResponse({
        status: 201,
        description: "Signer invited",
        schema: {
            example: {
                ...DOCUMENT_EXAMPLE,
                signerIds: ["7ace8b71-3d2a-5e5b-0d23-55e5735f9g92"],
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Only the creator can invite",
        schema: { example: NOT_AUTHORIZED },
    })
    inviteSigner(
        @Param("id") id: string,
        @CurrentUser() user: User,
        @Body() dto: InviteSignerDto,
    ) {
        return this.documentsService.inviteSigner(id, user.id, dto);
    }

    @Post(":id/sign")
    @ApiOperation({ summary: "Sign a document with TOTP verification" })
    @ApiResponse({
        status: 201,
        description: "Document signed",
        schema: {
            example: {
                id: "507f1f77bcf86cd799439011",
                status: "fully_signed",
                hash: "sha256:abc123def456...",
                signedAt: "2026-03-27T10:00:00.000Z",
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: "TOTP required or invalid",
        schema: {
            example: {
                statusCode: 400,
                message: "TOTP required or invalid",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: "No pending signature for this user",
        schema: {
            example: {
                statusCode: 404,
                message: "No pending signature for this user",
                error: "Not Found",
            },
        },
    })
    sign(
        @Param("id") id: string,
        @CurrentUser() user: User,
        @Body() dto: SignDocumentDto,
    ) {
        return this.documentsService.sign(id, user.id, dto);
    }

    @Get(":id/audit")
    @ApiOperation({ summary: "Get audit trail for a document" })
    @ApiResponse({
        status: 200,
        description: "Audit entries",
        schema: {
            example: {
                documentId: "507f1f77bcf86cd799439011",
                events: [
                    {
                        action: "created",
                        userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
                        timestamp: "2026-03-27T10:00:00.000Z",
                        hash: "sha256:abc123...",
                    },
                ],
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Not authorized",
        schema: { example: NOT_AUTHORIZED },
    })
    getAudit(@Param("id") id: string, @CurrentUser() user: User) {
        return this.documentsService.getAudit(id, user.id);
    }
}
