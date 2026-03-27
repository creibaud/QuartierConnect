import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";
import type { ServiceCategory } from "src/database/mongodb/models/service.model";

export const SERVICE_CATEGORIES = [
    "gardening",
    "repair",
    "cleaning",
    "babysitting",
    "tutoring",
    "delivery",
    "moving",
    "cooking",
    "other",
] as const;

export const SERVICE_TYPES = ["free", "paid"] as const;

export class CreateServiceDto {
    @ApiProperty({ description: "Quartier UUID" })
    @IsUUID()
    quartierId: string;

    @ApiProperty({ minLength: 2, maxLength: 255 })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    title: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: SERVICE_CATEGORIES })
    @IsEnum(SERVICE_CATEGORIES)
    category: ServiceCategory;

    @ApiProperty({ enum: SERVICE_TYPES })
    @IsEnum(SERVICE_TYPES)
    type: "free" | "paid";

    @ApiProperty({ minimum: 5, maximum: 1440 })
    @IsInt()
    @Min(5)
    @Max(1440)
    estimatedDurationMinutes: number;
}
