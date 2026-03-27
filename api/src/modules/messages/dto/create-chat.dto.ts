import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsOptional,
    IsString,
    IsUUID,
} from "class-validator";

export class CreateChatDto {
    @ApiProperty({
        type: [String],
        description: "UUIDs of participants (1-9 besides self)",
    })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(9)
    @IsUUID("4", { each: true })
    participantIds: string[];

    @ApiPropertyOptional({ description: "Chat name (for group chats)" })
    @IsOptional()
    @IsString()
    name?: string;
}
