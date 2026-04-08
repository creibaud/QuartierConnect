import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterDto {
    @ApiProperty({ example: "alice@demo.fr" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "Demo1234!", minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;
}

export class RegisterResponseDto {
    @ApiProperty({
        example: "otpauth://totp/QuartierConnect:alice%40demo.fr?...",
    })
    otpauthUrl: string;
}
