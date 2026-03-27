import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class CreateDocumentDto {
    @ApiProperty({ maxLength: 255 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ enum: ["contract", "other"], default: "other" })
    @IsOptional()
    @IsEnum(["contract", "other"])
    documentType: "contract" | "other" = "other";
}
