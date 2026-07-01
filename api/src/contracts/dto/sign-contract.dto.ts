import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SignContractDto {
    @ApiProperty({ example: "123456", description: "Code TOTP de validation" })
    @IsString()
    @IsNotEmpty()
    totpCode: string;

    @ApiPropertyOptional({
        description: "Signature dessinée (data-URL PNG), optionnelle",
        example: "data:image/png;base64,iVBORw0KGgo…",
    })
    @IsString()
    @IsOptional()
    signatureImage?: string;
}
