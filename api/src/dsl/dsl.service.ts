import * as path from "path";
import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Model } from "mongoose";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { Event } from "../events/schemas/event.schema";
import { Neighborhood } from "../neighborhoods/schemas/neighborhood.schema";
import { Service } from "../services/schemas/service.schema";

interface PythonModule {
    execute: (query: string) => Promise<string>;
}

interface CompiledQuery {
    type: "find" | "count";
    collection: string;
    filter: Record<string, unknown>;
    limit: number | null;
}

export interface DslRequester {
    sub: string;
    role: string;
    neighborhoodId?: string | null;
}

const MAX_DSL_RESULTS = 100;

function clampLimit(limit: number | null): number {
    return Math.min(limit ?? MAX_DSL_RESULTS, MAX_DSL_RESULTS);
}

@Injectable()
export class DslService {
    private readonly logger = new Logger(DslService.name);
    private dslModule: PythonModule | null = null;

    constructor(
        private readonly config: ConfigService,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        @InjectModel(Neighborhood.name)
        private readonly neighborhoodModel: Model<Neighborhood>,
        @InjectModel(Service.name)
        private readonly serviceModel: Model<Service>,
        @InjectModel(Event.name)
        private readonly eventModel: Model<Event>,
    ) {}

    private async getDslModule(): Promise<PythonModule> {
        if (!this.dslModule) {
            try {
                const { python } = await import("pythonia");
                const dslPath = path.resolve(
                    this.config.get<string>(
                        "DSL_PATH",
                        path.join(process.cwd(), "dsl"),
                    ),
                );
                this.dslModule = (await python(
                    path.join(dslPath, "main.py"),
                )) as PythonModule;
            } catch (error) {
                const detail =
                    error instanceof Error
                        ? `${error.name}: ${error.message}`
                        : String(error);
                this.logger.error(
                    `Failed to load DSL Python module: ${detail}`,
                );
                throw new BadRequestException("DSL engine unavailable");
            }
        }
        return this.dslModule;
    }

    async execute(
        queryString: string,
        requester?: DslRequester,
    ): Promise<unknown> {
        const dsl = await this.getDslModule();

        let compiled: CompiledQuery;
        try {
            const resultJson: string = await dsl.execute(queryString);
            compiled = JSON.parse(resultJson) as CompiledQuery;
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);
            if (
                message.includes("SyntaxError") ||
                message.includes("ValueError")
            ) {
                const detail = message
                    .replace(/.*(?:SyntaxError|ValueError):\s*/, "")
                    .trim();
                throw new BadRequestException(detail || "Invalid DSL query");
            }
            throw new BadRequestException(
                message.trim()
                    ? `DSL execution failed: ${message.trim()}`
                    : "Invalid DSL query",
            );
        }

        return this.runCompiledQuery(compiled, requester);
    }

    // Non-admins are scoped to their own neighborhood; the neighborhoods
    // collection stays public.
    private isNeighborhoodScoped(requester?: DslRequester): boolean {
        return requester !== undefined && requester.role !== "admin";
    }

    private async runCompiledQuery(
        compiled: CompiledQuery,
        requester?: DslRequester,
    ): Promise<unknown> {
        const { type, collection, filter, limit } = compiled;
        const scoped = this.isNeighborhoodScoped(requester);
        if (
            scoped &&
            !requester?.neighborhoodId &&
            collection !== "neighborhoods"
        ) {
            return type === "count" ? { count: 0 } : [];
        }
        const scopedNeighborhoodId = scoped
            ? (requester?.neighborhoodId as string)
            : undefined;

        switch (collection) {
            case "neighborhoods":
                return this.runMongo(
                    this.neighborhoodModel,
                    type,
                    filter,
                    limit,
                );
            case "services":
                return this.runMongo(
                    this.serviceModel,
                    type,
                    this.withNeighborhoodFilter(filter, scopedNeighborhoodId),
                    limit,
                );
            case "events":
                return this.runMongo(
                    this.eventModel,
                    type,
                    this.withNeighborhoodFilter(filter, scopedNeighborhoodId),
                    limit,
                );
            case "incidents":
                return this.runIncidents(
                    type,
                    filter,
                    limit,
                    scopedNeighborhoodId,
                );
            case "users":
                return this.runUsers(type, filter, limit, scopedNeighborhoodId);
            default:
                throw new BadRequestException(
                    `Unknown collection: ${collection}`,
                );
        }
    }

    private withNeighborhoodFilter(
        filter: Record<string, unknown>,
        neighborhoodId: string | undefined,
    ): Record<string, unknown> {
        if (!neighborhoodId) return filter;
        return { ...filter, neighborhoodId };
    }

    private async runMongo(
        model: Model<unknown>,
        type: "find" | "count",
        filter: Record<string, unknown>,
        limit: number | null,
    ): Promise<unknown> {
        if (type === "count") {
            return { count: await model.countDocuments(filter) };
        }
        return model
            .find(filter)
            .lean()
            .limit(clampLimit(limit))
            .exec() as Promise<unknown>;
    }

    private extractEqualityFilter(
        filter: Record<string, unknown>,
        field: string,
        collection: string,
    ): string | undefined {
        const keys = Object.keys(filter);
        if (keys.length === 0) return undefined;

        const value = filter[field];
        const isSimpleEquality =
            keys.length === 1 && keys[0] === field && typeof value === "string";
        if (!isSimpleEquality) {
            throw new BadRequestException(
                `Only simple equality filters on "${field}" are supported for ${collection} (PostgreSQL-backed collection)`,
            );
        }
        return value;
    }

    private async runIncidents(
        type: "find" | "count",
        filter: Record<string, unknown>,
        limit: number | null,
        neighborhoodId?: string,
    ): Promise<unknown> {
        const status = this.extractEqualityFilter(
            filter,
            "status",
            "incidents",
        );
        const conditions = [isNull(schema.incidents.deletedAt)];

        if (status) {
            conditions.push(eq(schema.incidents.status, status));
        }
        if (neighborhoodId) {
            conditions.push(
                eq(schema.incidents.neighborhoodId, neighborhoodId),
            );
        }

        const where = and(...conditions);

        if (type === "count") {
            const rows = await this.db
                .select({ id: schema.incidents.id })
                .from(schema.incidents)
                .where(where);
            return { count: rows.length };
        }

        const rows = await this.db
            .select()
            .from(schema.incidents)
            .where(where)
            .limit(clampLimit(limit));

        return rows;
    }

    private async runUsers(
        type: "find" | "count",
        filter: Record<string, unknown>,
        limit: number | null,
        neighborhoodId?: string,
    ): Promise<unknown> {
        const role = this.extractEqualityFilter(filter, "role", "users");
        const conditions: ReturnType<typeof eq>[] = [];
        if (role) conditions.push(eq(schema.users.role, role));
        if (neighborhoodId) {
            conditions.push(eq(schema.users.neighborhoodId, neighborhoodId));
        }
        const where = conditions.length ? and(...conditions) : undefined;

        if (type === "count") {
            const rows = await this.db
                .select({ id: schema.users.id })
                .from(schema.users)
                .where(where);
            return { count: rows.length };
        }

        const rows = await this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
                createdAt: schema.users.createdAt,
            })
            .from(schema.users)
            .where(where)
            .limit(clampLimit(limit));

        return rows;
    }
}
