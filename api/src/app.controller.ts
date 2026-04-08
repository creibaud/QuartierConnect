import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { and, count, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
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
    @ApiOperation({ summary: "Health check" })
    @ApiResponse({
        status: 200,
        description: '{ status: "ok", timestamp: string }',
    })
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
        summary: "Statistiques globales (admin)",
        description:
            "Retourne des compteurs agrégés depuis PostgreSQL (users, incidents) et MongoDB (neighborhoods). Chaque compteur est isolé dans un try/catch.",
    })
    @ApiResponse({
        status: 200,
        schema: {
            example: {
                users: 42,
                incidents: 17,
                neighborhoods: 5,
                activeIncidents: 8,
            },
        },
    })
    @ApiResponse({ status: 403, description: "Rôle insuffisant" })
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
