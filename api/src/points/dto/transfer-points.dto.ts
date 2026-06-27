import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class TransferPointsDto {
    @ApiProperty({
        description: "UUID of the recipient user",
        example: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    })
    @IsUUID()
    recipientId: string;

    @ApiProperty({
        description: "Number of points to transfer (minimum 1)",
        example: 10,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
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
