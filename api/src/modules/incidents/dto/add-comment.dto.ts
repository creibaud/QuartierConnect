import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class AddCommentDto {
    @ApiProperty({ example: "Je confirme ce problème, il est très dangereux." })
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    content: string;
}
