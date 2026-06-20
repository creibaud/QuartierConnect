import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";

export class GeoJsonPolygonDto {
    @ApiProperty({ example: "Polygon" })
    @IsString()
    type: "Polygon";

    @ApiProperty({
        example: [
            [
                [2.35, 48.87],
                [2.36, 48.87],
                [2.36, 48.88],
                [2.35, 48.88],
                [2.35, 48.87],
            ],
        ],
        description: "Array of GeoJSON rings — first ring = outer boundary",
    })
    @IsArray()
    coordinates: number[][][];
}

export class CreateNeighborhoodDto {
    @ApiProperty({ description: "Neighborhood name", example: "Belleville" })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: "City", example: "Paris" })
    @IsString()
    @IsNotEmpty()
    city: string;

    @ApiProperty({
        description: "Neighborhood description",
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: "GeoJSON polygon delimiting the neighborhood",
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
