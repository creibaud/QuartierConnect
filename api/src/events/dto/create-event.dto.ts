import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsDateString,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { GeoPointDto } from "../../common/dto/geo-point.dto";

export const EVENT_CATEGORIES = [
    "culture",
    "sport",
    "community",
    "education",
    "other",
] as const;

export class CreateEventDto {
    @ApiProperty({
        description: "Title of the event",
        example: "Neighborhood garage sale",
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({
        description: "Description of the event",
        example:
            "Large annual garage sale, from 9am to 6pm, at the market square.",
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: "Category of the event",
        example: "community",
        enum: EVENT_CATEGORIES,
    })
    @IsIn(EVENT_CATEGORIES)
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
    @ValidateNested()
    @Type(() => GeoPointDto)
    location?: GeoPointDto;
}
