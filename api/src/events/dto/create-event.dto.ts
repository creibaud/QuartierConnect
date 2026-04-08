import { ApiProperty } from "@nestjs/swagger";
import {
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
} from "class-validator";

export class CreateEventDto {
    @ApiProperty({
        description: "Titre de l'événement",
        example: "Vide-grenier du quartier",
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: "Description de l'événement",
        example: "Grand vide-grenier annuel, de 9h à 18h, place du marché.",
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: "Catégorie de l'événement",
        example: "community",
        enum: ["culture", "sport", "community", "education", "other"],
    })
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiProperty({
        description: "Date et heure de l'événement au format ISO 8601",
        example: "2026-05-15T09:00:00.000Z",
    })
    @IsDateString()
    date: string;

    @ApiProperty({
        description: "Identifiant MongoDB du quartier (optionnel)",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        required: false,
    })
    @IsString()
    @IsOptional()
    neighborhoodId?: string;
}
