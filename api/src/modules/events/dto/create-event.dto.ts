import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUrl,
    IsUUID,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";
import type { EventCategory } from "src/database/mongodb/models/event.model";

export const EVENT_CATEGORIES = [
    "social",
    "sport",
    "cultural",
    "educational",
    "professional",
    "family",
    "other",
] as const;

export class CreateEventDto {
    @ApiProperty({ minLength: 2, maxLength: 255 })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(255)
    title: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: EVENT_CATEGORIES })
    @IsEnum(EVENT_CATEGORIES)
    category: EventCategory;

    @ApiProperty({ description: "ISO 8601 date string" })
    @IsDateString()
    startDate: string;

    @ApiPropertyOptional({ description: "ISO 8601 date string" })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    locationName?: string;

    @ApiPropertyOptional({
        description: "GeoJSON Point",
        example: { type: "Point", coordinates: [2.3522, 48.8566] },
    })
    @IsOptional()
    @IsObject()
    location?: { type: "Point"; coordinates: [number, number] };

    @ApiPropertyOptional({ minimum: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxCapacity?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @ApiProperty({ description: "UUID of the quartier this event belongs to" })
    @IsUUID()
    quartierId: string;
}
