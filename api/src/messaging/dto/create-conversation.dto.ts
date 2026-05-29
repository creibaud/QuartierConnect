import { ApiProperty } from "@nestjs/swagger";
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEmail,
    IsOptional,
    IsString,
} from "class-validator";

export class CreateConversationDto {
    @ApiProperty({
        example: ["user-uuid-1"],
        description:
            "User IDs (Postgres UUIDs). Mutually exclusive with participantEmails.",
        required: false,
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    participants?: string[];

    @ApiProperty({
        example: ["bob@demo.fr"],
        description:
            "User emails — resolved to IDs server-side. Mutually exclusive with participants.",
        required: false,
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsEmail({}, { each: true })
    participantEmails?: string[];

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isGroup?: boolean;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    groupName?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    neighborhoodId?: string;
}
