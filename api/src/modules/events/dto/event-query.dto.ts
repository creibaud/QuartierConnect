import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
} from "class-validator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import type { EventCategory } from "src/database/mongodb/models/event.model";
import { EVENT_CATEGORIES } from "src/modules/events/dto/create-event.dto";

export class EventQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: EVENT_CATEGORIES })
    @IsOptional()
    @IsEnum(EVENT_CATEGORIES)
    category?: EventCategory;

    @ApiPropertyOptional({ description: "Filter by quartier UUID" })
    @IsOptional()
    @IsUUID()
    quartierId?: string;

    @ApiPropertyOptional({ description: "Filter only upcoming events" })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
    })
    @IsBoolean()
    upcoming?: boolean;

    @ApiPropertyOptional({ description: "Search by title" })
    @IsOptional()
    @IsString()
    search?: string;
}
