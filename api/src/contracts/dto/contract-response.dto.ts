import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContractStatus } from "../schemas/contract.schema";

export class SignatureDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    userId: string;

    @ApiProperty({ example: "2026-06-10T14:00:00.000Z" })
    signedAt: string;

    @ApiProperty({
        example: "a3f1b2c4d5e6...",
        description: "SHA-256 du contenu au moment de la signature",
    })
    hash: string;
}

export class ContractDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c20" })
    _id: string;

    @ApiProperty({ example: "Accord de service jardinage" })
    title: string;

    @ApiProperty({
        example:
            "Je, soussigné, m'engage à fournir des services de jardinage chaque samedi...",
    })
    content: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    createdBy: string;

    @ApiProperty({
        type: [String],
        example: ["b2c3d4e5-f6a7-8901-bcde-f12345678901"],
    })
    signatories: string[];

    @ApiProperty({
        enum: ContractStatus,
        example: ContractStatus.PENDING_SIGNATURE,
    })
    status: ContractStatus;

    @ApiProperty({
        example: "a3f1b2c4...",
        description: "SHA-256 du champ `content`",
    })
    contentHash: string;

    @ApiPropertyOptional({
        example: "2026-06-10T14:00:00.000Z",
        nullable: true,
    })
    signedAt?: string | null;

    @ApiProperty({ type: [SignatureDto] })
    signatures: SignatureDto[];

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    createdAt: string;
}
