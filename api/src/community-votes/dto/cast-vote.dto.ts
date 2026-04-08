import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsObject, IsOptional } from "class-validator";

export class CastVoteDto {
    @ApiProperty({
        description: "IDs des options choisies",
        example: ["yes"],
        type: [String],
    })
    @IsArray()
    @IsNotEmpty({ each: true })
    choices: string[];

    @ApiProperty({
        description: "Poids par option (uniquement pour le type weighted)",
        example: { yes: 3, no: 2 },
        required: false,
    })
    @IsObject()
    @IsOptional()
    weights?: Record<string, number>;
}
