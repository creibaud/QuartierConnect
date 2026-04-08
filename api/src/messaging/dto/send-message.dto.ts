import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { MessageType } from "../schemas/message.schema";

export class SendMessageDto {
    @ApiProperty({ example: "conv-id-123" })
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    @ApiProperty({ enum: MessageType, default: MessageType.TEXT })
    @IsEnum(MessageType)
    @IsOptional()
    type?: MessageType;

    @ApiProperty({ example: "Bonjour !" })
    @IsString()
    @IsOptional()
    content?: string;
}
