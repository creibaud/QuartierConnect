import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsArray,
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    MinLength,
} from "class-validator";
import { incidentPriorityEnum } from "src/database/drizzle/schema";

export class CreateIncidentDto {
    @ApiProperty({
        example: "Nid-de-poule rue de la Paix",
        minLength: 2,
        maxLength: 255,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    title: string;

    @ApiPropertyOptional({ example: "Un grand nid-de-poule dangereux" })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        enum: incidentPriorityEnum.enumValues,
        default: "medium",
    })
    @IsOptional()
    @IsEnum(incidentPriorityEnum.enumValues)
    priority?: "low" | "medium" | "high" | "critical";

    @ApiPropertyOptional({ description: "GeoJSON location of the incident" })
    @IsOptional()
    @IsObject()
    locationGeojson?: object;

    @ApiPropertyOptional({ type: [String], description: "URLs of attachments" })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    attachmentUrls?: string[];
}
