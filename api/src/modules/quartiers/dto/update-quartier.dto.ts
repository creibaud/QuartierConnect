import { ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from "class-validator";

export class UpdateQuartierDto {
    @ApiPropertyOptional({
        example: "Belleville",
        minLength: 2,
        maxLength: 100,
    })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ example: "Un quartier animé au nord-est de Paris" })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ description: "Updated GeoJSON polygon" })
    @IsOptional()
    @IsObject()
    geojson?: object;
}
