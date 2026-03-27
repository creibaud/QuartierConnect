import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { sql } from "drizzle-orm";
import { Public } from "src/common/decorators/public.decorator";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";

@ApiTags("System")
@Controller("health")
export class HealthController {
    constructor(
        @Inject("DRIZZLE") private readonly db: DrizzleDB,
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        @Inject("NEO4J") private readonly neo4j: Neo4jDriver,
    ) {}

    @Public()
    @Get()
    @ApiOperation({ summary: "Check API and database health" })
    @ApiResponse({
        status: 200,
        description: "Health status for API, PostgreSQL, MongoDB and Neo4j",
        schema: {
            example: {
                status: "ok",
                databases: {
                    postgres: true,
                    mongodb: true,
                    neo4j: true,
                },
                app: "running",
                timestamp: "2026-03-27T10:00:00.000Z",
            },
        },
    })
    async check() {
        const [postgres, mongodb, neo4j] = await Promise.all([
            this.checkPostgres(),
            this.checkMongodb(),
            this.checkNeo4j(),
        ]);

        const allOk = postgres && mongodb && neo4j;

        return {
            status: allOk ? "ok" : "degraded",
            databases: { postgres, mongodb, neo4j },
            app: "running",
            timestamp: new Date().toISOString(),
        };
    }

    private async checkPostgres(): Promise<boolean> {
        try {
            await this.db.execute(sql`SELECT 1`);
            return true;
        } catch {
            return false;
        }
    }

    private async checkMongodb(): Promise<boolean> {
        try {
            await this.mongo.command({ ping: 1 });
            return true;
        } catch {
            return false;
        }
    }

    private async checkNeo4j(): Promise<boolean> {
        try {
            await this.neo4j.verifyConnectivity();
            return true;
        } catch {
            return false;
        }
    }
}
