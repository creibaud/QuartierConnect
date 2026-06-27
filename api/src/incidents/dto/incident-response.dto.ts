import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IncidentDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    id: string;

    @ApiProperty({ example: "Broken streetlight on Rue de la Paix" })
    title: string;

    @ApiProperty({
        example:
            "The streetlight at number 12 has fallen and is partially blocking the sidewalk.",
    })
    description: string;

    @ApiProperty({
        example: "open",
        enum: ["open", "in_progress", "resolved"],
        description: "State machine: open → in_progress → resolved",
    })
    status: string;

    @ApiProperty({ example: "f1e2d3c4-b5a6-7890-1234-567890abcdef" })
    createdBy: string;

    @ApiPropertyOptional({
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        nullable: true,
    })
    neighborhoodId: string | null;

    @ApiPropertyOptional({ example: 48.8566, nullable: true })
    lat: number | null;

    @ApiPropertyOptional({ example: 2.3522, nullable: true })
    lng: number | null;

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
        description: "Number of incidents inserted or updated",
    })
    upserted: number;

    @ApiProperty({
        example: 1,
        description: "Incidents skipped (createdBy does not match the JWT)",
    })
    skipped: number;
}
