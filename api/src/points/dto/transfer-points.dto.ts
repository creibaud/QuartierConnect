import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export const MAX_TRANSFER_AMOUNT = 100_000;

export class TransferPointsDto {
    @ApiProperty({
        description: "UUID of the recipient user",
        example: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    })
    @IsUUID()
    recipientId: string;

    @ApiProperty({
        description: `Number of points to transfer (integer, 1 to ${MAX_TRANSFER_AMOUNT})`,
        example: 10,
        minimum: 1,
        maximum: MAX_TRANSFER_AMOUNT,
    })
    @IsInt()
    @Min(1)
    @Max(MAX_TRANSFER_AMOUNT)
    amount: number;

    @ApiProperty({
        description: "Optional note accompanying the transfer",
        example: "Thanks for your help with the gardening!",
        required: false,
    })
    @IsString()
    @IsOptional()
    note?: string;
}
