import { ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";
import type { ServiceCategory } from "src/database/mongodb/models/service.model";
import { SERVICE_CATEGORIES } from "src/modules/services/dto/create-service.dto";

export class UpdateServiceDto {
    @ApiPropertyOptional({ minLength: 2, maxLength: 255 })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ enum: SERVICE_CATEGORIES })
    @IsOptional()
    @IsEnum(SERVICE_CATEGORIES)
    category?: ServiceCategory;

    @ApiPropertyOptional({ minimum: 5, maximum: 1440 })
    @IsOptional()
    @IsInt()
    @Min(5)
    @Max(1440)
    estimatedDurationMinutes?: number;
}
