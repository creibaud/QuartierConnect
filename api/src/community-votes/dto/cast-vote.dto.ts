import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsObject, IsOptional } from "class-validator";

export class CastVoteDto {
    @ApiProperty({
        description: "IDs of the chosen options",
        example: ["yes"],
        type: [String],
    })
    @IsArray()
    @IsNotEmpty({ each: true })
    choices: string[];

    @ApiProperty({
        description: "Weight per option (only for the weighted type)",
        example: { yes: 3, no: 2 },
        required: false,
    })
    @IsObject()
    @IsOptional()
    weights?: Record<string, number>;
}
