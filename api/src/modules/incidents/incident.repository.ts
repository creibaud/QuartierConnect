import { and, eq, ilike, sql, type SQL } from "drizzle-orm";
import {
    buildPaginatedResult,
    resolvePagination,
} from "src/common/query/query.helper";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import {
    incidentComments,
    incidents,
    type Incident,
    type IncidentComment,
    type IncidentPriority,
    type IncidentStatus,
    type IncidentType,
    type NewIncident,
    type NewIncidentComment,
} from "src/database/drizzle/schema";

export interface IncidentFilters {
    search?: string;
    status?: IncidentStatus;
    priority?: IncidentPriority;
    type?: IncidentType;
}

export interface IIncidentsRepository {
    create(data: NewIncident): Promise<Incident>;
    findAll(
        filters: IncidentFilters,
        page: number,
        limit: number,
    ): Promise<ReturnType<typeof buildPaginatedResult>>;
    findOne(id: string): Promise<Incident | null>;
    update(id: string, data: Partial<Incident>): Promise<Incident | null>;
    delete(id: string): Promise<void>;
    createComment(data: NewIncidentComment): Promise<IncidentComment>;
    findComments(
        incidentId: string,
        page: number,
        limit: number,
    ): Promise<ReturnType<typeof buildPaginatedResult>>;
}

export class IncidentsRepository implements IIncidentsRepository {
    constructor(private readonly db: DrizzleDB) {}

    async create(data: NewIncident): Promise<Incident> {
        const [incident] = await this.db
            .insert(incidents)
            .values(data)
            .returning();

        return incident;
    }

    async findAll(
        filters: IncidentFilters,
        page: number,
        limit: number,
    ): Promise<ReturnType<typeof buildPaginatedResult>> {
        const { offset } = resolvePagination(page, limit);
        const conditions: (SQL | undefined)[] = [];

        if (filters.search) {
            conditions.push(ilike(incidents.title, `%${filters.search}%`));
        }
        if (filters.status) {
            conditions.push(eq(incidents.status, filters.status));
        }
        if (filters.priority) {
            conditions.push(eq(incidents.priority, filters.priority));
        }
        if (filters.type) {
            conditions.push(eq(incidents.type, filters.type));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [data, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(incidents)
                .where(where)
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(incidents)
                .where(where),
        ]);

        return buildPaginatedResult(data, Number(count), page, limit);
    }

    async findOne(id: string): Promise<Incident | null> {
        const [incident] = await this.db
            .select()
            .from(incidents)
            .where(eq(incidents.id, id))
            .limit(1);

        return incident ?? null;
    }

    async update(
        id: string,
        data: Partial<Incident>,
    ): Promise<Incident | null> {
        const [updated] = await this.db
            .update(incidents)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(incidents.id, id))
            .returning();

        return updated ?? null;
    }

    async delete(id: string): Promise<void> {
        await this.db.delete(incidents).where(eq(incidents.id, id));
    }

    async createComment(data: NewIncidentComment): Promise<IncidentComment> {
        const [comment] = await this.db
            .insert(incidentComments)
            .values(data)
            .returning();

        return comment;
    }

    async findComments(
        incidentId: string,
        page: number,
        limit: number,
    ): Promise<ReturnType<typeof buildPaginatedResult>> {
        const { offset } = resolvePagination(page, limit);

        const [data, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(incidentComments)
                .where(eq(incidentComments.incidentId, incidentId))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(incidentComments)
                .where(eq(incidentComments.incidentId, incidentId)),
        ]);

        return buildPaginatedResult(data, Number(count), page, limit);
    }
}
