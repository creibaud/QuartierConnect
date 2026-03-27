import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SignDocumentDto {
    @ApiProperty({ description: "TOTP code", minLength: 6, maxLength: 8 })
    @IsString()
    @MinLength(6)
    @MaxLength(8)
    totpCode: string;

    @ApiPropertyOptional({ description: "Signature image as base64" })
    @IsOptional()
    @IsString()
    signatureImageBase64?: string;
}
