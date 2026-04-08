import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: "alice@demo.fr" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "Demo1234!" })
    @IsString()
    password: string;

    @ApiProperty({ example: "123456" })
    @IsString()
    @Length(6, 6)
    totpCode: string;
}
