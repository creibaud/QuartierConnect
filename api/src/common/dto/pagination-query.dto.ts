import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class PaginationQueryDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({
        description: "Field to sort by (e.g., createdAt, email)",
    })
    @IsOptional()
    @IsString()
    sortBy?: string = "createdAt";

    @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
    @IsOptional()
    @IsIn(["asc", "desc"])
    sortOrder?: "asc" | "desc" = "desc";
}
