import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsDateString, IsOptional, IsString } from "class-validator";

export class SyncDeltaQueryDto {
    @ApiProperty({ description: "ISO date string of last sync" })
    @IsDateString()
    lastSyncTimestamp: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    entityTypes?: string[];
}
