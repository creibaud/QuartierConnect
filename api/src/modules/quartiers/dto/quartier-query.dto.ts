import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";

export class QuartierQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: "Filter by quartier name" })
    @IsOptional()
    @IsString()
    search?: string;
}
