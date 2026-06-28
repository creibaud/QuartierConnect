import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { IncidentDto } from "../../incidents/dto/incident-response.dto";

export class UserPublicDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    id: string;

    @ApiProperty({ example: "alice@demo.fr" })
    email: string;

    @ApiProperty({
        example: "resident",
        enum: ["resident", "moderator", "admin", "banned"],
    })
    role: string;

    @ApiProperty({ example: "2026-03-15T10:00:00.000Z" })
    createdAt: string;
}

export class UserSearchResultDto {
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

export class PointsBalanceDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    userId: string;

    @ApiProperty({ example: 150 })
    balance: number;
}

export class PointsTransactionDto {
    @ApiProperty({ example: "tx-uuid-1234" })
    id: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    senderId: string;

    @ApiProperty({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901" })
    recipientId: string;

    @ApiProperty({ example: 10 })
    amount: number;

    @ApiPropertyOptional({ example: "Thanks for the gardening!" })
    note: string | null;

    @ApiProperty({ example: "2026-04-05T12:00:00.000Z" })
    createdAt: string;
}

export class SocialRelationDto {
    @ApiProperty({ example: "INTERESTED_IN" })
    relationship: string;

    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0e" })
    targetId: string;
}

export class GdprExportDto {
    @ApiProperty({ type: UserPublicDto, nullable: true })
    profile: UserPublicDto | null;

    @ApiProperty({ type: [IncidentDto] })
    incidents: IncidentDto[];

    @ApiProperty({ type: PointsBalanceDto, nullable: true })
    pointsBalance: PointsBalanceDto | null;

    @ApiProperty({ type: [PointsTransactionDto] })
    transactions: PointsTransactionDto[];

    @ApiProperty({ type: [SocialRelationDto] })
    socialData: SocialRelationDto[];
}

export class DeleteAccountBodyDto {
    @ApiProperty({
        example: "123456",
        description: "6-digit TOTP code required to confirm the deletion",
    })
    @IsString()
    totpCode: string;
}

export class ChangePasswordDto {
    @ApiProperty({ example: "Demo1234!" })
    @IsString()
    currentPassword: string;

    @ApiProperty({ example: "NewDemo1234!", minLength: 8 })
    @IsString()
    @MinLength(8)
    newPassword: string;
}

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: "Alice" })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiPropertyOptional({ example: "Martin" })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiPropertyOptional({
        description: "Avatar as a data URL (resized client-side) or image URL",
    })
    @IsOptional()
    @IsString()
    @MaxLength(700000)
    avatarUrl?: string;
}
