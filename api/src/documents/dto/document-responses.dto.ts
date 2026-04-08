import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AuditAction } from "../schemas/document-audit.schema";

export class DocumentMetaDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c50" })
    fileId: string;

    @ApiProperty({ example: "rapport-assemblee.pdf" })
    fileName: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    uploadedBy: string;

    @ApiPropertyOptional({
        example: "664f1a2b3c4d5e6f7a8b9c01",
        nullable: true,
    })
    neighborhoodId?: string | null;

    @ApiProperty({ example: "application/pdf" })
    contentType: string;

    @ApiProperty({ example: 204800, description: "Taille en octets" })
    size: number;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    uploadedAt: string;
}

export class DocumentAuditEntryDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c60" })
    _id: string;

    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c50" })
    fileId: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    userId: string;

    @ApiProperty({
        enum: AuditAction,
        example: AuditAction.UPLOAD,
    })
    action: AuditAction;

    @ApiProperty({ example: "rapport-assemblee.pdf" })
    fileName: string;

    @ApiPropertyOptional({
        example: { contentType: "application/pdf" },
        description: "Métadonnées supplémentaires selon l'action",
    })
    metadata?: Record<string, unknown>;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    createdAt: string;
}

export class DocumentUploadBodyDto {
    @ApiProperty({
        type: "string",
        format: "binary",
        description: "Fichier à uploader (max 20 Mo)",
    })
    file: string;
}
