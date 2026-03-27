import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import {
    incidentPriorityEnum,
    incidentStatusEnum,
} from "src/database/drizzle/schema";

export class UpdateIncidentDto {
    @ApiPropertyOptional({ enum: incidentStatusEnum.enumValues })
    @IsOptional()
    @IsEnum(incidentStatusEnum.enumValues)
    status?: "open" | "in_progress" | "resolved" | "closed";

    @ApiPropertyOptional({ enum: incidentPriorityEnum.enumValues })
    @IsOptional()
    @IsEnum(incidentPriorityEnum.enumValues)
    priority?: "low" | "medium" | "high" | "critical";

    @ApiPropertyOptional({ example: "Mise à jour de la description" })
    @IsOptional()
    @IsString()
    description?: string;
}
