import { ApiProperty } from "@nestjs/swagger";

export class UserProfileDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    id: string;

    @ApiProperty({ example: "alice@demo.fr" })
    email: string;

    @ApiProperty({
        example: "resident",
        enum: ["resident", "moderator", "admin", "banned"],
    })
    role: string;
}

export class AuthTokensResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    refreshToken: string;

    @ApiProperty({ type: UserProfileDto })
    user: UserProfileDto;
}

export class RefreshTokensResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    refreshToken: string;
}

export class LogoutResponseDto {
    @ApiProperty({ example: true })
    success: boolean;
}
