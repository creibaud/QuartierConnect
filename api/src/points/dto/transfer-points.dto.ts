import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class TransferPointsDto {
    @ApiProperty({
        description: "UUID de l'utilisateur destinataire",
        example: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    })
    @IsUUID()
    recipientId: string;

    @ApiProperty({
        description: "Nombre de points à transférer (minimum 1)",
        example: 10,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    amount: number;

    @ApiProperty({
        description: "Note optionnelle accompagnant le transfert",
        example: "Merci pour ton aide au jardinage !",
        required: false,
    })
    @IsString()
    @IsOptional()
    note?: string;
}
