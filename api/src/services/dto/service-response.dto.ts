import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ServiceDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0d" })
    _id: string;

    @ApiProperty({ example: "Aide au jardinage" })
    title: string;

    @ApiProperty({
        example: "Disponible les week-ends pour jardinage et entretien.",
    })
    description: string;

    @ApiProperty({ example: "gardening" })
    category: string;

    @ApiProperty({
        example: "free",
        enum: ["free", "paid", "exchange"],
    })
    type: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    createdBy: string;

    @ApiPropertyOptional({
        example: "664f1a2b3c4d5e6f7a8b9c01",
        nullable: true,
    })
    neighborhoodId?: string | null;

    @ApiProperty({ example: 1.0 })
    pointsMultiplier: number;

    @ApiPropertyOptional({
        example: { type: "Point", coordinates: [2.3522, 48.8566] },
        nullable: true,
    })
    location?: { type: "Point"; coordinates: [number, number] } | null;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    createdAt: string;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    updatedAt: string;
}
