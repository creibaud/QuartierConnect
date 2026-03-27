import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID } from "class-validator";

export class AdjustmentDto {
    @ApiProperty({ description: "Target user UUID" })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: "Points to add (positive) or remove (negative)",
    })
    @IsInt()
    pointsAmount: number;

    @ApiPropertyOptional({ description: "Reason for the adjustment" })
    @IsOptional()
    @IsString()
    description?: string;
}
