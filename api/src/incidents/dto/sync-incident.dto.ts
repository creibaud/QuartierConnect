import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsDateString,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ValidateNested,
} from "class-validator";

export class SyncIncidentItemDto {
    @ApiProperty({
        description: "UUID v4 de l'incident (généré côté client, idempotent)",
        example: "00000000-0000-4000-b000-000000000001",
    })
    @IsUUID()
    id: string;

    @ApiProperty({
        description: "Titre court de l'incident",
        example: "Nid-de-poule boulevard Voltaire",
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: "Description complète de l'incident",
        example: "Gros nid-de-poule devant le n°45, dangereux pour les vélos.",
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description:
            "UUID de l'utilisateur propriétaire de l'incident (doit correspondre au JWT)",
        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    })
    @IsUUID()
    createdBy: string;

    @ApiProperty({
        description: "Identifiant MongoDB du quartier (optionnel)",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        required: false,
    })
    @IsString()
    @IsOptional()
    neighborhoodId?: string;

    @ApiProperty({
        description: "Statut de l'incident (open | in_progress | resolved)",
        example: "in_progress",
        required: false,
    })
    @IsIn(["open", "in_progress", "resolved"])
    @IsOptional()
    status?: string;

    @ApiProperty({
        description: "Date ISO 8601 de dernière modification côté client (LWW)",
        example: "2026-04-05T14:30:00.000Z",
        required: false,
    })
    @IsDateString()
    @IsOptional()
    updatedAt?: string;

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

export class SyncIncidentsDto {
    @ApiProperty({
        description:
            "Liste des incidents à synchroniser depuis le client Java Desktop. Seuls les incidents dont createdBy correspond au JWT sont upsertés ; les autres sont ignorés.",
        type: [SyncIncidentItemDto],
        example: [
            {
                id: "00000000-0000-4000-b000-000000000001",
                title: "Nid-de-poule boulevard Voltaire",
                description: "Gros nid-de-poule devant le n°45.",
                createdBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            },
        ],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SyncIncidentItemDto)
    incidents: SyncIncidentItemDto[];
}
