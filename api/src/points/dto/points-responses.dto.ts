import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PointsBalanceResponseDto {
    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    userId: string;

    @ApiProperty({ example: 150 })
    balance: number;
}

export class PointsTransactionResponseDto {
    @ApiProperty({ example: "tx-uuid-1234" })
    id: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" })
    senderId: string;

    @ApiProperty({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901" })
    recipientId: string;

    @ApiProperty({ example: 10 })
    amount: number;

    @ApiPropertyOptional({
        example: "Merci pour le jardinage !",
        nullable: true,
    })
    note: string | null;

    @ApiProperty({ example: "2026-04-05T12:00:00.000Z" })
    createdAt: string;
}

export class TransferResponseDto {
    @ApiProperty({ type: PointsTransactionResponseDto })
    transaction: PointsTransactionResponseDto;

    @ApiProperty({ example: 140, description: "Nouveau solde de l'expéditeur" })
    senderBalance: number;

    @ApiProperty({ example: 60, description: "Nouveau solde du destinataire" })
    recipientBalance: number;
}
