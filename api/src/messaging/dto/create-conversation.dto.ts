import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateConversationDto {
    @ApiProperty({ example: ["user-uuid-1", "user-uuid-2"] })
    @IsArray()
    participants: string[];

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
