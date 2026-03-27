import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class RespondVoteDto {
    @ApiProperty({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    selectedOptions: string[];

    @ApiPropertyOptional({
        description: "For weighted votes: map of option ID to weight value",
    })
    @IsOptional()
    @IsObject()
    weightedValues?: Record<string, number>;
}
