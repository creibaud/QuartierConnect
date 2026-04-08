import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EventDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0e" })
    _id: string;

    @ApiProperty({ example: "Vide-grenier du quartier" })
    title: string;

    @ApiProperty({
        example: "Grand vide-grenier annuel ouvert à tous les habitants.",
    })
    description: string;

    @ApiProperty({ example: "community" })
    category: string;

    @ApiProperty({ example: "2026-05-15T09:00:00.000Z" })
    date: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    createdBy: string;

    @ApiPropertyOptional({
        example: "664f1a2b3c4d5e6f7a8b9c01",
        nullable: true,
    })
    neighborhoodId?: string | null;

    @ApiProperty({
        type: [String],
        example: ["uuid-1", "uuid-2"],
        description: "UUIDs des utilisateurs ayant marqué leur intérêt",
    })
    interestedUserIds: string[];

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    createdAt: string;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    updatedAt: string;
}

export class EventInterestResponseDto {
    @ApiProperty({
        example: 3,
        description: "Nombre total de personnes intéressées",
    })
    interested: number;
}
