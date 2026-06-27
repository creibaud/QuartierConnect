import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class DslQueryDto {
    @ApiProperty({
        example: 'FIND incidents WHERE status = "open" LIMIT 10',
        description: "QuartierConnect DSL query",
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    query: string;
}
