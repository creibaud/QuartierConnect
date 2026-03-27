import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from "class-validator";

export class AddSignatureZoneDto {
    @ApiProperty({ description: "UUID of the user to sign" })
    @IsUUID()
    signerId: string;

    @ApiProperty({
        description: "Horizontal position (0-1)",
        minimum: 0,
        maximum: 1,
    })
    @IsNumber()
    @Min(0)
    @Max(1)
    x: number;

    @ApiProperty({
        description: "Vertical position (0-1)",
        minimum: 0,
        maximum: 1,
    })
    @IsNumber()
    @Min(0)
    @Max(1)
    y: number;

    @ApiProperty({ description: "Page number", minimum: 1 })
    @IsInt()
    @Min(1)
    page: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    width?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    height?: number;
}
