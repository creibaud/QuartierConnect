import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from "class-validator";

export class CreateQuartierDto {
    @ApiProperty({ example: "Belleville", minLength: 2, maxLength: 100 })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ example: "Un quartier animé au nord-est de Paris" })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({
        description: "GeoJSON Polygon representing the quartier boundaries",
        example: {
            type: "Polygon",
            coordinates: [
                [
                    [2.38, 48.86],
                    [2.4, 48.86],
                    [2.4, 48.87],
                    [2.38, 48.87],
                    [2.38, 48.86],
                ],
            ],
        },
    })
    @IsNotEmpty()
    @IsObject()
    geojson: object;
}
