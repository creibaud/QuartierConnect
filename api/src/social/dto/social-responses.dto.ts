import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RecommendationItemDto {
    @ApiProperty({
        example: "service",
        enum: ["service", "event", "neighborhood"],
    })
    type: string;

    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0d" })
    id: string;

    @ApiProperty({ example: "Municipal library" })
    name: string;

    @ApiProperty({
        example: 3,
        description: "Recommendation score (Neo4j paths)",
    })
    score: number;

    @ApiPropertyOptional({ example: "Service in your neighborhood" })
    reason?: string;
}

export class RecordInterestBodyDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0e" })
    eventId: string;

    @ApiProperty({ example: true })
    interested: boolean;
}

export class RecordInterestResponseDto {
    @ApiProperty({ example: true })
    success: boolean;
}
