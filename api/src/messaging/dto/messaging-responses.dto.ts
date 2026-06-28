import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MessageType } from "../schemas/message.schema";

export class ParticipantInfoDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    id: string;

    @ApiProperty({ example: "bob@demo.fr", nullable: true })
    email: string | null;

    @ApiPropertyOptional({ example: "Bob Dupont", nullable: true })
    name: string | null;
}

export class ConversationDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c30" })
    _id: string;

    @ApiProperty({
        type: [String],
        example: [
            "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        ],
        description: "UUIDs of the participants",
    })
    participants: string[];

    @ApiProperty({
        type: [ParticipantInfoDto],
        description: "Participants with their resolved email",
    })
    participantsInfo: ParticipantInfoDto[];

    @ApiPropertyOptional({
        example: "664f1a2b3c4d5e6f7a8b9c01",
        nullable: true,
    })
    neighborhoodId?: string | null;

    @ApiProperty({ example: false })
    isGroup: boolean;

    @ApiPropertyOptional({
        example: "Belleville neighbors group",
        nullable: true,
    })
    groupName?: string | null;

    @ApiPropertyOptional({
        example: "2026-04-05T12:00:00.000Z",
        nullable: true,
    })
    lastMessageAt?: string | null;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    createdAt: string;
}

export class MessageDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c40" })
    _id: string;

    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c30" })
    conversationId: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    senderId: string;

    @ApiProperty({
        enum: MessageType,
        example: MessageType.TEXT,
    })
    type: MessageType;

    @ApiPropertyOptional({
        example: "Hi! Still available this Saturday?",
    })
    content?: string;

    @ApiPropertyOptional({
        example: "664f1a2b3c4d5e6f7a8b9c99",
        description: "GridFS FileId (only for type FILE or IMAGE)",
    })
    fileId?: string;

    @ApiPropertyOptional({ example: "garden-photo.jpg" })
    fileName?: string;

    @ApiProperty({ example: false })
    deleted: boolean;

    @ApiProperty({ example: "2026-04-05T12:00:00.000Z" })
    createdAt: string;
}

export class FileUploadBodyDto {
    @ApiProperty({
        type: "string",
        format: "binary",
        description: "File to send (max 10 MB)",
    })
    file: string;
}
