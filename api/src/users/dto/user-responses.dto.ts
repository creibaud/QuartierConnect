import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsEmail,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from "class-validator";
import { IncidentDto } from "../../incidents/dto/incident-response.dto";

const TOTP_CODE_PATTERN = /^\d{6}$/;
const LOOSE_E164_PATTERN = /^\+?[0-9 .()-]{6,20}$/;

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
        enum: ["resident", "moderator", "admin"],
    })
    role: string;

    @ApiPropertyOptional({ example: "Alice", nullable: true })
    firstName: string | null;

    @ApiPropertyOptional({ example: "Martin", nullable: true })
    lastName: string | null;

    @ApiPropertyOptional({
        example: "/users/avatar/664f1a2b3c4d5e6f7a8b9c0d",
        nullable: true,
        description: "Path to the public avatar endpoint",
    })
    avatarUrl: string | null;
}

export class NeighborDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    id: string;

    @ApiProperty({
        example: "Alice Martin",
        description: "Display name built from first and last name",
    })
    name: string;
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

export class GdprProfileDto extends UserPublicDto {
    @ApiPropertyOptional({ example: "+33612345678", nullable: true })
    phone: string | null;
}

export class ExportedMessageDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0d" })
    id: string;

    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0e" })
    conversationId: string;

    @ApiProperty({ example: "text" })
    type: string;

    @ApiPropertyOptional({ example: "Hello neighbour!", nullable: true })
    content: string | null;

    @ApiPropertyOptional({ example: "photo.png", nullable: true })
    fileName: string | null;

    @ApiProperty({ example: false })
    deleted: boolean;

    @ApiPropertyOptional({ example: "2026-04-05T12:00:00.000Z" })
    createdAt: Date | null;
}

export class ContractSignatureDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    userId: string;

    @ApiProperty({ example: "2026-04-05T12:00:00.000Z" })
    signedAt: Date;
}

export class ExportedContractDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0d" })
    id: string;

    @ApiProperty({ example: "Gardening service contract" })
    title: string;

    @ApiProperty({ example: "fully_signed" })
    status: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    createdBy: string;

    @ApiProperty({ type: [String] })
    signatories: string[];

    @ApiPropertyOptional({ example: "2026-04-05T12:00:00.000Z" })
    signedAt: Date | null;

    @ApiProperty({ type: [ContractSignatureDto] })
    signatures: ContractSignatureDto[];

    @ApiPropertyOptional({ example: "2026-04-01T12:00:00.000Z" })
    createdAt: Date | null;
}

export class ExportedBookingDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0d" })
    id: string;

    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0e" })
    serviceId: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    initiatorId: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    payerId: string;

    @ApiProperty({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901" })
    payeeId: string;

    @ApiProperty({ example: 10 })
    pointsAmount: number;

    @ApiProperty({ example: "accepted" })
    status: string;

    @ApiPropertyOptional({ nullable: true })
    contractId: string | null;

    @ApiPropertyOptional({ example: "2026-04-05T12:00:00.000Z" })
    createdAt: Date | null;
}

export class ExportedVoteDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0d" })
    id: string;

    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0e" })
    targetId: string;

    @ApiProperty({ example: "incident" })
    targetType: string;

    @ApiProperty({ example: "like" })
    voteType: string;

    @ApiPropertyOptional({ example: "2026-04-05T12:00:00.000Z" })
    createdAt: Date | null;
}

export class ExportedCommunityBallotDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0d" })
    id: string;

    @ApiProperty({ example: "Repaint the community hall?" })
    title: string;

    @ApiProperty({ example: "open" })
    status: string;

    @ApiProperty({ type: [String] })
    choices: string[];

    @ApiPropertyOptional({ example: "2026-04-05T12:00:00.000Z" })
    castAt: Date | null;
}

export class ExportedServiceDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0d" })
    id: string;

    @ApiProperty({ example: "Gardening help" })
    title: string;

    @ApiProperty({ example: "gardening" })
    category: string;

    @ApiProperty({ example: "paid" })
    type: string;

    @ApiProperty({ example: "active" })
    status: string;

    @ApiPropertyOptional({ example: "2026-04-05T12:00:00.000Z" })
    createdAt: Date | null;
}

export class GdprExportDto {
    @ApiProperty({ type: GdprProfileDto, nullable: true })
    profile: GdprProfileDto | null;

    @ApiPropertyOptional({
        example: "2026-03-15T10:00:00.000Z",
        nullable: true,
        description: "When the user granted GDPR consent at registration",
    })
    consentTimestamp: Date | null;

    @ApiProperty({ type: [IncidentDto] })
    incidents: IncidentDto[];

    @ApiProperty({ type: PointsBalanceDto, nullable: true })
    pointsBalance: PointsBalanceDto | null;

    @ApiProperty({ type: [PointsTransactionDto] })
    transactions: PointsTransactionDto[];

    @ApiProperty({ type: [SocialRelationDto] })
    socialData: SocialRelationDto[];

    @ApiProperty({ type: [ExportedMessageDto] })
    messagesSent: ExportedMessageDto[];

    @ApiProperty({ type: [ExportedContractDto] })
    contracts: ExportedContractDto[];

    @ApiProperty({ type: [ExportedBookingDto] })
    bookings: ExportedBookingDto[];

    @ApiProperty({ type: [ExportedVoteDto] })
    votes: ExportedVoteDto[];

    @ApiProperty({ type: [ExportedCommunityBallotDto] })
    communityBallots: ExportedCommunityBallotDto[];

    @ApiProperty({ type: [ExportedServiceDto] })
    services: ExportedServiceDto[];
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

    @ApiProperty({
        example: "123456",
        description: "6-digit TOTP code required to confirm the change",
    })
    @IsString()
    @Matches(TOTP_CODE_PATTERN, { message: "totpCode must be 6 digits" })
    totpCode: string;
}

export class ChangeEmailDto {
    @ApiProperty({ example: "alice.new@demo.fr" })
    @IsEmail()
    newEmail: string;

    @ApiProperty({ example: "Demo1234!" })
    @IsString()
    password: string;

    @ApiProperty({
        example: "123456",
        description: "6-digit TOTP code required to confirm the change",
    })
    @IsString()
    @Matches(TOTP_CODE_PATTERN, { message: "totpCode must be 6 digits" })
    totpCode: string;
}

export class ChangePhoneDto {
    @ApiPropertyOptional({
        example: "+33 6 12 34 56 78",
        nullable: true,
        description: "Loose E.164 phone number; omit or send null to erase",
    })
    @IsOptional()
    @IsString()
    @Matches(LOOSE_E164_PATTERN, {
        message: "phone must be a valid E.164 phone number",
    })
    phone?: string | null;

    @ApiProperty({
        example: "123456",
        description: "6-digit TOTP code required to confirm the change",
    })
    @IsString()
    @Matches(TOTP_CODE_PATTERN, { message: "totpCode must be 6 digits" })
    totpCode: string;
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
}
