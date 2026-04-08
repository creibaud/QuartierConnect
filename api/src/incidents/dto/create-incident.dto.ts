import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

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
}
