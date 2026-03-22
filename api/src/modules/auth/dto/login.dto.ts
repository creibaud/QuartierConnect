import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: "john.doe@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "P@ssw0rd!" })
    @IsString()
    password: string;
}
