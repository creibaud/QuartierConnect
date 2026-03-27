import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";

export class VoteQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: "Filter active votes (endsAt > now)" })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
    })
    @IsBoolean()
    active?: boolean;

    @ApiPropertyOptional({ description: "Filter by quartier UUID" })
    @IsOptional()
    @IsUUID()
    quartierId?: string;
}
