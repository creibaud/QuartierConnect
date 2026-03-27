import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from "class-validator";
import { userRoleEnum, type UserRole } from "src/database/drizzle/schema";

export class UpdateUserDto {
    @ApiPropertyOptional({ example: "John" })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    firstName?: string;

    @ApiPropertyOptional({ example: "Doe" })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    lastName?: string;
}

export class UpdateUserRoleDto {
    @ApiProperty({
        enum: userRoleEnum.enumValues,
        description: "New role to assign to the user",
    })
    @IsEnum(userRoleEnum.enumValues)
    role: UserRole;
}

export class UpdateUserStatusDto {
    @ApiProperty({ description: "Active status of the user", example: true })
    @IsBoolean()
    isActive: boolean;
}
