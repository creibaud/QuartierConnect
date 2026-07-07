import { ApiProperty } from "@nestjs/swagger";
import {
    ArrayMaxSize,
    ArrayMinSize,
    Equals,
    IsArray,
    IsNumber,
} from "class-validator";

// GeoJSON Point ([lng, lat]) validated here so a malformed shape is rejected with 400.
export class GeoPointDto {
    @ApiProperty({ enum: ["Point"], example: "Point" })
    @Equals("Point")
    type: "Point";

    @ApiProperty({ type: [Number], example: [2.3522, 48.8566] })
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsNumber({}, { each: true })
    coordinates: [number, number];
}
