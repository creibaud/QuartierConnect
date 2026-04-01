import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReportMessageDto {
    @ApiPropertyOptional({
        example: "Contenu offensant ou harcèlement",
        maxLength: 500,
        description: "Optional reason for the report",
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
