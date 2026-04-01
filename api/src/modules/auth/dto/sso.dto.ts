import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class SsoLoginDto {
    @ApiProperty({ example: "admin@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "P@ssw0rd!" })
    @IsString()
    password: string;

    @ApiPropertyOptional({
        example: "123456",
        description: "TOTP code (required if TOTP is enabled on this account)",
    })
    @IsOptional()
    @IsString()
    totpCode?: string;
}

export class SsoTokenResponseDto {
    @ApiProperty({
        description:
            "Long-lived JWT access token (24 h) for the Java desktop application. " +
            'Contains aud: ["desktop"] claim to identify the client type.',
    })
    accessToken: string;

    @ApiProperty({ description: "Token type", example: "Bearer" })
    tokenType: string;

    @ApiProperty({ description: "Expiry duration in seconds", example: 86400 })
    expiresIn: number;

    @ApiProperty({ description: "Authenticated user information" })
    user: {
        id: string;
        email: string;
        role: string;
    };
}
