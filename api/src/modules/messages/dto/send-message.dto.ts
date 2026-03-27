import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SendMessageDto {
    @ApiProperty({ maxLength: 4000 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(4000)
    content: string;
}
