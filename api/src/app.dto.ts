import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
    @ApiProperty({ example: "ok" })
    status: string;

    @ApiProperty({ example: "2026-04-08T10:00:00.000Z" })
    timestamp: string;

    @ApiProperty({ example: "1.0.0" })
    version: string;
}

export class StatsResponseDto {
    @ApiProperty({ example: 42, nullable: true })
    users: number | null;

    @ApiProperty({ example: 17, nullable: true })
    incidents: number | null;

    @ApiProperty({ example: 5, nullable: true })
    neighborhoods: number | null;

    @ApiProperty({
        example: 8,
        nullable: true,
        description: "Incidents with status 'open'",
    })
    activeIncidents: number | null;
}
