import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IncidentDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    id: string;

    @ApiProperty({ example: "Lampadaire cassé rue de la Paix" })
    title: string;

    @ApiProperty({
        example:
            "Le lampadaire au numéro 12 est tombé et bloque partiellement le trottoir.",
    })
    description: string;

    @ApiProperty({
        example: "open",
        enum: ["open", "in_progress", "resolved"],
        description: "Machine d'états : open → in_progress → resolved",
    })
    status: string;

    @ApiProperty({ example: "f1e2d3c4-b5a6-7890-1234-567890abcdef" })
    createdBy: string;

    @ApiPropertyOptional({
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        nullable: true,
    })
    neighborhoodId: string | null;

    @ApiPropertyOptional({ example: null, nullable: true })
    deletedAt: string | null;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    createdAt: string;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    updatedAt: string;
}

export class SyncResultDto {
    @ApiProperty({
        example: 2,
        description: "Nombre d'incidents insérés ou mis à jour",
    })
    upserted: number;

    @ApiProperty({
        example: 1,
        description: "Incidents ignorés (createdBy ne correspond pas au JWT)",
    })
    skipped: number;
}
