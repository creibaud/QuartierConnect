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

    async execute(queryString: string): Promise<unknown> {
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
                throw new BadRequestException(
                    message.replace(/.*(?:SyntaxError|ValueError):\s*/, ""),
                );
            }
            throw new BadRequestException(`DSL execution failed: ${message}`);
        }

        return this.runCompiledQuery(compiled);
    }

    private async runCompiledQuery(compiled: CompiledQuery): Promise<unknown> {
        const { type, collection, filter, limit } = compiled;

        switch (collection) {
            case "neighborhoods":
                return this.runMongo(
                    this.neighborhoodModel,
                    type,
                    filter,
                    limit,
                );
            case "services":
                return this.runMongo(this.serviceModel, type, filter, limit);
            case "events":
                return this.runMongo(this.eventModel, type, filter, limit);
            case "incidents":
                return this.runIncidents(type, filter, limit);
            case "users":
                return this.runUsers(type, filter, limit);
            default:
                throw new BadRequestException(
                    `Unknown collection: ${collection}`,
                );
        }
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
        const query = model.find(filter).lean();
        if (limit) query.limit(limit);
        return query.exec() as Promise<unknown>;
    }

    private async runIncidents(
        type: "find" | "count",
        filter: Record<string, unknown>,
        limit: number | null,
    ): Promise<unknown> {
        const conditions = [isNull(schema.incidents.deletedAt)];

        if (typeof filter["status"] === "string") {
            conditions.push(eq(schema.incidents.status, filter["status"]));
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
            .limit(limit ?? 100);

        return rows;
    }

    private async runUsers(
        type: "find" | "count",
        filter: Record<string, unknown>,
        limit: number | null,
    ): Promise<unknown> {
        const where =
            typeof filter["role"] === "string"
                ? eq(schema.users.role, filter["role"])
                : undefined;

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
            .limit(limit ?? 100);

        return rows;
    }
}
