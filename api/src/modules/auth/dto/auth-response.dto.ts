import { ApiProperty } from "@nestjs/swagger";

export class AuthUserResponseDto {
    @ApiProperty({ example: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81" })
    id: string;

    @ApiProperty({ example: "jean.dupont@example.com" })
    email: string;

    @ApiProperty({ example: "resident" })
    role: string;
}

export class AuthTokenResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    accessToken: string;

    @ApiProperty({ type: AuthUserResponseDto })
    user: AuthUserResponseDto;
}

export class TotpLoginChallengeResponseDto {
    @ApiProperty({ example: true })
    requiresTotp: true;

    @ApiProperty({
        description:
            "Short-lived token required to complete TOTP login challenge",
        example: "totp_challenge_token",
    })
    totpToken: string;
}

export class MessageResponseDto {
    @ApiProperty({ example: "Logged out successfully" })
    message: string;
}

export class TotpSetupResponseDto {
    @ApiProperty({ example: "JBSWY3DPEHPK3PXP" })
    secret: string;

    @ApiProperty({
        example:
            "otpauth://totp/QuartierConnect:jean.dupont@example.com?secret=JBSWY3DPEHPK3PXP&issuer=QuartierConnect",
    })
    qrCodeUrl: string;

    @ApiProperty({ type: [String], example: ["abc123", "def456"] })
    backupCodes: string[];
}
