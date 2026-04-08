import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GeoJsonPolygonResponseDto {
    @ApiProperty({ example: "Polygon" })
    type: string;

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
        description:
            "Tableau de rings GeoJSON — premier ring = contour extérieur",
    })
    coordinates: number[][][];
}

export class NeighborhoodDto {
    @ApiProperty({ example: "664f1a2b3c4d5e6f7a8b9c0d" })
    _id: string;

    @ApiProperty({ example: "Belleville" })
    name: string;

    @ApiProperty({ example: "Paris" })
    city: string;

    @ApiPropertyOptional({
        example: "Quartier populaire dans le 20e arrondissement",
    })
    description?: string;

    @ApiPropertyOptional({ type: GeoJsonPolygonResponseDto })
    geometry?: GeoJsonPolygonResponseDto;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    createdAt: string;

    @ApiProperty({ example: "2026-04-05T10:00:00.000Z" })
    updatedAt: string;
}
