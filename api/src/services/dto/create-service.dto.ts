import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Max,
    Min,
} from "class-validator";

export class CreateServiceDto {
    @ApiProperty({
        description: "Titre de l'annonce de service",
        example: "Aide au jardinage le week-end",
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: "Description complète du service proposé",
        example:
            "Je propose mon aide pour désherber, tailler les haies et entretenir votre jardin les samedis matin.",
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: "Catégorie du service",
        example: "gardening",
        enum: [
            "gardening",
            "handyman",
            "transport",
            "shopping",
            "childcare",
            "it-support",
            "other",
        ],
    })
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiProperty({
        description: "Type de service : gratuit, payant ou échange de services",
        enum: ["free", "paid", "exchange"],
        example: "free",
    })
    @IsString()
    @IsIn(["free", "paid", "exchange"])
    type: string;

    @ApiProperty({
        description: "Identifiant MongoDB du quartier (optionnel)",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        required: false,
    })
    @IsString()
    @IsOptional()
    neighborhoodId?: string;

    @ApiProperty({
        description:
            "Coefficient multiplicateur de points par catégorie (admin)",
        example: 1.5,
        required: false,
        minimum: 0.1,
        maximum: 10.0,
    })
    @IsNumber()
    @Min(0.1)
    @Max(10.0)
    @IsOptional()
    pointsMultiplier?: number;

    @ApiPropertyOptional({
        description: "Position GeoJSON (coordinates = [lng, lat])",
        example: { type: "Point", coordinates: [2.3522, 48.8566] },
    })
    @IsOptional()
    @IsObject()
    location?: { type: "Point"; coordinates: [number, number] };
}
