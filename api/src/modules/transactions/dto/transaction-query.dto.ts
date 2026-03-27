import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import type { TransactionType } from "src/database/mongodb/models/transaction.model";

const TRANSACTION_TYPES = ["service_exchange", "adjustment", "refund"] as const;

export class TransactionQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: TRANSACTION_TYPES })
    @IsOptional()
    @IsEnum(TRANSACTION_TYPES)
    type?: TransactionType;

    @ApiPropertyOptional({ description: "Filter by sender user UUID" })
    @IsOptional()
    @IsUUID()
    fromUserId?: string;

    @ApiPropertyOptional({ description: "Filter by recipient user UUID" })
    @IsOptional()
    @IsUUID()
    toUserId?: string;
}
