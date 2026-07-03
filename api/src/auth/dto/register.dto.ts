import { ApiProperty } from "@nestjs/swagger";
import {
    Equals,
    IsEmail,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from "class-validator";

const LOOSE_E164_PATTERN = /^\+?[0-9 .()-]{6,20}$/;

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

    @ApiProperty({ example: "+33612345678", required: false })
    @IsOptional()
    @IsString()
    @Matches(LOOSE_E164_PATTERN, {
        message: "phone must be a valid E.164 phone number",
    })
    phone?: string;

    @ApiProperty({
        example: true,
        description:
            "Explicit consent to the terms of service and data processing (GDPR). Must be true.",
    })
    @Equals(true, { message: "consent must be explicitly granted" })
    consent: boolean;
}

export class RegisterResponseDto {
    @ApiProperty({
        example: "otpauth://totp/QuartierConnect:alice%40demo.fr?...",
    })
    otpauthUrl: string;
}
