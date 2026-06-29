import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class SubmitAddressDto {
    @ApiProperty({ example: "12 rue de Reuilly, 75012 Paris" })
    @IsString()
    @MinLength(5)
    address!: string;
}
