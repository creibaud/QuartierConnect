import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from "class-validator";

export class CreateIncidentDto {
    @ApiProperty({
        description: "Short title of the incident",
        example: "Broken streetlight on Rue de la Paix",
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: "Detailed description of the incident",
        example:
            "The streetlight at number 12 has fallen and is partially blocking the sidewalk.",
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description:
            "MongoDB identifier of the relevant neighborhood (optional)",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        required: false,
    })
    @IsString()
    @IsOptional()
    neighborhoodId?: string;

    @ApiPropertyOptional({
        description: "Latitude (-90..90)",
        example: 48.8566,
    })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat?: number;

    @ApiPropertyOptional({
        description: "Longitude (-180..180)",
        example: 2.3522,
    })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    lng?: number;

    @ApiPropertyOptional({
        enum: ["neighborhood", "reporting", "bug"],
        default: "neighborhood",
    })
    @IsOptional()
    @IsIn(["neighborhood", "reporting", "bug"])
    category?: string;
}
