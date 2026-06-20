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
        description:
            "UUID v4 of the incident (generated client-side, idempotent)",
        example: "00000000-0000-4000-b000-000000000001",
    })
    @IsUUID()
    id: string;

    @ApiProperty({
        description: "Short title of the incident",
        example: "Pothole on Boulevard Voltaire",
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: "Full description of the incident",
        example: "Large pothole in front of no. 45, dangerous for cyclists.",
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description:
            "UUID of the user who owns the incident (must match the JWT)",
        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    })
    @IsUUID()
    createdBy: string;

    @ApiProperty({
        description: "MongoDB identifier of the neighborhood (optional)",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
        required: false,
    })
    @IsString()
    @IsOptional()
    neighborhoodId?: string;

    @ApiProperty({
        description: "Status of the incident (open | in_progress | resolved)",
        example: "in_progress",
        required: false,
    })
    @IsIn(["open", "in_progress", "resolved"])
    @IsOptional()
    status?: string;

    @ApiProperty({
        description: "ISO 8601 date of last client-side modification (LWW)",
        example: "2026-04-05T14:30:00.000Z",
        required: false,
    })
    @IsDateString()
    @IsOptional()
    updatedAt?: string;

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
}

export class SyncIncidentsDto {
    @ApiProperty({
        description:
            "List of incidents to sync from the Java Desktop client. Only incidents whose createdBy matches the JWT are upserted; the others are ignored.",
        type: [SyncIncidentItemDto],
        example: [
            {
                id: "00000000-0000-4000-b000-000000000001",
                title: "Pothole on Boulevard Voltaire",
                description: "Large pothole in front of no. 45.",
                createdBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            },
        ],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SyncIncidentItemDto)
    incidents: SyncIncidentItemDto[];
}
