import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsDateString,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
} from "class-validator";

export class CreateEventDto {
    @ApiProperty({
        description: "Title of the event",
        example: "Neighborhood garage sale",
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: "Description of the event",
        example:
            "Large annual garage sale, from 9am to 6pm, at the market square.",
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: "Category of the event",
        example: "community",
        enum: ["culture", "sport", "community", "education", "other"],
    })
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiProperty({
        description: "Date and time of the event in ISO 8601 format",
        example: "2026-05-15T09:00:00.000Z",
    })
    @IsDateString()
    date: string;

    @ApiProperty({
        description: "MongoDB identifier of the neighborhood (optional)",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        required: false,
    })
    @IsString()
    @IsOptional()
    neighborhoodId?: string;

    @ApiPropertyOptional({
        description: "Human-readable postal address",
        example: "Market square",
    })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({
        description: "GeoJSON position (coordinates = [lng, lat])",
        example: { type: "Point", coordinates: [2.3522, 48.8566] },
    })
    @IsOptional()
    @IsObject()
    location?: { type: "Point"; coordinates: [number, number] };
}
