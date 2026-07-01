import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateIf,
} from "class-validator";

export class CreateServiceDto {
    @ApiProperty({
        description: "Title of the service listing",
        example: "Gardening help on weekends",
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: "Full description of the offered service",
        example:
            "I offer my help to weed, trim hedges, and maintain your garden on Saturday mornings.",
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: "Service category",
        example: "gardening",
        enum: [
            "gardening",
            "handyman",
            "transport",
            "shopping",
            "childcare",
            "it-support",
            "other",
        ],
    })
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiProperty({
        description: "Service type: free, paid, or service exchange",
        enum: ["free", "paid", "exchange"],
        example: "free",
    })
    @IsString()
    @IsIn(["free", "paid", "exchange"])
    type: string;

    @ApiProperty({
        description: "MongoDB identifier of the neighborhood (optional)",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        required: false,
    })
    @IsString()
    @IsOptional()
    neighborhoodId?: string;

    @ApiProperty({
        description: "Points multiplier coefficient per category (admin)",
        example: 1.5,
        required: false,
        minimum: 0.1,
        maximum: 10.0,
    })
    @IsNumber()
    @Min(0.1)
    @Max(10.0)
    @IsOptional()
    pointsMultiplier?: number;

    @ApiPropertyOptional({
        description: "GeoJSON position (coordinates = [lng, lat])",
        example: { type: "Point", coordinates: [2.3522, 48.8566] },
    })
    @IsOptional()
    @IsObject()
    location?: { type: "Point"; coordinates: [number, number] };

    @ApiProperty({
        description: "Service direction: offer or request",
        enum: ["offer", "request"],
        example: "offer",
    })
    @IsIn(["offer", "request"])
    direction: string;

    @ApiPropertyOptional({
        description: "Free-text address (geocoded to location)",
    })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({
        description: "Duration in minutes (required for paid services)",
        example: 60,
        minimum: 1,
    })
    @ValidateIf((o: CreateServiceDto) => o.type === "paid")
    @IsInt()
    @Min(1)
    duration?: number;

    @ApiPropertyOptional({
        description: "Listing status",
        enum: ["active", "closed"],
        example: "active",
    })
    @IsOptional()
    @IsIn(["active", "closed"])
    status?: string;

    @ApiPropertyOptional({
        description: "Explicit points price (overrides the derived amount)",
        example: 8,
        minimum: 0,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    pointsAmount?: number;
}
