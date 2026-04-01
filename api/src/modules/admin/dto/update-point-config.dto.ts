import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Max, Min } from "class-validator";

export class UpdatePointConfigDto {
    @ApiProperty({
        description:
            "Points awarded per full hour of service. Default: 2.",
        minimum: 0.5,
        maximum: 20,
        example: 2.0,
    })
    @IsNumber()
    @Min(0.5)
    @Max(20)
    basePointsPerHour: number;

    @ApiProperty({
        description:
            "Multiplier applied on top of the base rate for this category. 1.0 = no change, 1.5 = 50% bonus.",
        minimum: 0.1,
        maximum: 5,
        example: 1.0,
    })
    @IsNumber()
    @Min(0.1)
    @Max(5)
    multiplier: number;
}
