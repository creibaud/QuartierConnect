import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class SignContractDto {
    @ApiProperty({ example: "123456", description: "Code TOTP de validation" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(10)
    totpCode: string;

    @ApiPropertyOptional({
        description: "Signature dessinée (data-URL PNG), optionnelle",
        example: "data:image/png;base64,iVBORw0KGgo…",
    })
    @IsString()
    @IsOptional()
    @MaxLength(1_000_000)
    signatureImage?: string;
}
