import { ApiProperty } from "@nestjs/swagger";
import {
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from "class-validator";

export class RegisterDto {
    @ApiProperty({ example: "alice@demo.fr" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "Demo1234!", minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: "Alice", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiProperty({ example: "Martin", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;
}

export class RegisterResponseDto {
    @ApiProperty({
        example: "otpauth://totp/QuartierConnect:alice%40demo.fr?...",
    })
    otpauthUrl: string;
}
