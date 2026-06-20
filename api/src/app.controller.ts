import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { and, count, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { HealthResponseDto, StatsResponseDto } from "./app.dto";
import { Roles } from "./auth/decorators/roles.decorator";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { DRIZZLE_TOKEN } from "./database/drizzle.module";
import * as schema from "./database/schema";
import { NeighborhoodsService } from "./neighborhoods/neighborhoods.service";

@ApiTags("System")
@Controller()
export class AppController {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly neighborhoodsService: NeighborhoodsService,
    ) {}

    @Get("health")
    @ApiOperation({
        summary: "Health check",
        description:
            "Returns the server status. Used by the Java SyncService every 30s.",
    })
    @ApiResponse({ status: 200, type: HealthResponseDto })
    health() {
        return {
            status: "ok",
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version ?? "1.0.0",
        };
    }

    @Get("stats")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin")
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Global statistics (admin)",
        description:
            "Returns aggregated counters from PostgreSQL (users, incidents) and MongoDB (neighborhoods). Each counter is isolated in its own try/catch.",
    })
    @ApiResponse({
        status: 200,
        type: StatsResponseDto,
        description:
            "Aggregated counters. Each value may be null if the database is temporarily unavailable.",
    })
    @ApiResponse({
        status: 403,
        description: "Insufficient role (admin required)",
    })
    async getStats() {
        const safe = async <T>(fn: () => Promise<T>): Promise<T | null> => {
            try {
                return await fn();
            } catch {
                return null;
            }
        };

        const [users, incidents, neighborhoods, activeIncidents] =
            await Promise.all([
                safe(async () => {
                    const [r] = await this.db
                        .select({ value: count() })
                        .from(schema.users);
                    return r?.value ?? 0;
                }),
                safe(async () => {
                    const [r] = await this.db
                        .select({ value: count() })
                        .from(schema.incidents)
                        .where(isNull(schema.incidents.deletedAt));
                    return r?.value ?? 0;
                }),
                safe(() => this.neighborhoodsService.count()),
                safe(async () => {
                    const [r] = await this.db
                        .select({ value: count() })
                        .from(schema.incidents)
                        .where(
                            and(
                                eq(schema.incidents.status, "open"),
                                isNull(schema.incidents.deletedAt),
                            ),
                        );
                    return r?.value ?? 0;
                }),
            ]);

        return { users, incidents, neighborhoods, activeIncidents };
    }
}
