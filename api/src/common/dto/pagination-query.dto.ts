import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export const MAX_PAGE_SIZE = 100;

export class PaginationQueryDto {
    @ApiPropertyOptional({
        description: "Page number (integer, minimum 1)",
        example: 1,
        minimum: 1,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({
        description: `Page size (integer, 1 to ${MAX_PAGE_SIZE})`,
        example: 20,
        minimum: 1,
        maximum: MAX_PAGE_SIZE,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_SIZE)
    @IsOptional()
    limit?: number;
}
