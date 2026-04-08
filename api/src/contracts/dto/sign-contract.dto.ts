import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class SignContractDto {
    @ApiProperty({ example: "123456", description: "Code TOTP de validation" })
    @IsString()
    @IsNotEmpty()
    totpCode: string;
}
