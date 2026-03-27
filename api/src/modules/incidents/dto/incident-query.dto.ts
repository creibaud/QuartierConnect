import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import {
    incidentPriorityEnum,
    incidentStatusEnum,
} from "src/database/drizzle/schema";

export class IncidentQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: incidentStatusEnum.enumValues })
    @IsOptional()
    @IsEnum(incidentStatusEnum.enumValues)
    status?: string;

    @ApiPropertyOptional({ enum: incidentPriorityEnum.enumValues })
    @IsOptional()
    @IsEnum(incidentPriorityEnum.enumValues)
    priority?: string;

    @ApiPropertyOptional({ description: "Search by title" })
    @IsOptional()
    @IsString()
    search?: string;
}
