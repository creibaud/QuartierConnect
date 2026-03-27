import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import type { ServiceCategory } from "src/database/mongodb/models/service.model";
import {
    SERVICE_CATEGORIES,
    SERVICE_TYPES,
} from "src/modules/services/dto/create-service.dto";

const SERVICE_STATUSES = [
    "open",
    "accepted",
    "completed",
    "cancelled",
] as const;

export class ServiceQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: SERVICE_CATEGORIES })
    @IsOptional()
    @IsEnum(SERVICE_CATEGORIES)
    category?: ServiceCategory;

    @ApiPropertyOptional({ enum: SERVICE_TYPES })
    @IsOptional()
    @IsEnum(SERVICE_TYPES)
    type?: "free" | "paid";

    @ApiPropertyOptional({ enum: SERVICE_STATUSES })
    @IsOptional()
    @IsEnum(SERVICE_STATUSES)
    status?: "open" | "accepted" | "completed" | "cancelled";

    @ApiPropertyOptional({ description: "Filter by quartier UUID" })
    @IsOptional()
    @IsUUID()
    quartierId?: string;

    @ApiPropertyOptional({ description: "Search in title or description" })
    @IsOptional()
    @IsString()
    search?: string;
}
