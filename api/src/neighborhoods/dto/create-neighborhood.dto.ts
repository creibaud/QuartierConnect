import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";

export class GeoJsonPolygonDto {
    @IsString()
    type: "Polygon";

    coordinates: number[][][];
}

export class CreateNeighborhoodDto {
    @ApiProperty({ description: "Nom du quartier", example: "Belleville" })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: "Ville", example: "Paris" })
    @IsString()
    @IsNotEmpty()
    city: string;

    @ApiProperty({
        description: "Description du quartier",
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: "Polygone GeoJSON délimitant le quartier",
        required: false,
        example: {
            type: "Polygon",
            coordinates: [
                [
                    [2.35, 48.87],
                    [2.36, 48.87],
                    [2.36, 48.88],
                    [2.35, 48.88],
                    [2.35, 48.87],
                ],
            ],
        },
    })
    @IsObject()
    @ValidateNested()
    @Type(() => GeoJsonPolygonDto)
    @IsOptional()
    geometry?: GeoJsonPolygonDto;
}
