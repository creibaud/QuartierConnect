import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from "class-validator";

export class CreateIncidentDto {
    @ApiProperty({
        description: "Titre court de l'incident",
        example: "Lampadaire cassé rue de la Paix",
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: "Description détaillée de l'incident",
        example:
            "Le lampadaire au numéro 12 est tombé et bloque partiellement le trottoir.",
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: "Identifiant MongoDB du quartier concerné (optionnel)",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        required: false,
    })
    @IsString()
    @IsOptional()
    neighborhoodId?: string;

    @ApiPropertyOptional({ description: "Latitude (-90..90)", example: 48.8566 })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat?: number;

    @ApiPropertyOptional({ description: "Longitude (-180..180)", example: 2.3522 })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    lng?: number;
}
