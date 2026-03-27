import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";

export class MessageQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description:
            "ISO date string for cursor-based pagination (fetch messages before this date)",
    })
    @IsOptional()
    @IsDateString()
    before?: string;
}
