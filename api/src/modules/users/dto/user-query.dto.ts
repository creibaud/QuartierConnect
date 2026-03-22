import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { userRoleEnum, type UserRole } from "src/database/drizzle/schema";

export const USER_SORT_FIELDS = [
    "email",
    "firstName",
    "lastName",
    "role",
    "balance",
    "isActive",
    "createdAt",
    "updatedAt",
] as const;

export class UserQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: "Filter by email or name" })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: userRoleEnum.enumValues })
    @IsOptional()
    @IsEnum(userRoleEnum.enumValues)
    role?: UserRole;

    @ApiPropertyOptional({ description: "Filter by active status" })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
    })
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ enum: USER_SORT_FIELDS })
    @IsOptional()
    @IsIn(USER_SORT_FIELDS)
    declare sortBy?: (typeof USER_SORT_FIELDS)[number];
}
