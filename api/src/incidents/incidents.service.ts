import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import {
    and,
    asc,
    count,
    desc,
    eq,
    gt,
    ilike,
    isNull,
    or,
    sql,
} from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Response } from "express";
import {
    escapeLike,
    parsePagination,
    resolveSort,
    setPageHeaders,
} from "../common/pagination";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import { SyncIncidentsDto } from "./dto/sync-incident.dto";
import { UpdateIncidentStatusDto } from "./dto/update-incident-status.dto";

const VALID_TRANSITIONS: Record<string, string[]> = {
    open: ["in_progress"],
    in_progress: ["resolved"],
    resolved: [],
};

const VALID_STATUSES = ["open", "in_progress", "resolved"] as const;

export interface AuthUser {
    sub: string;
    role: string;
    neighborhoodId?: string | null;
}

export interface ListIncidentsQuery {
    status?: string;
    category?: string;
    search?: string;
    sort?: string;
    order?: string;
    page: string;
    limit: string;
    since?: string;
}

@Injectable()
export class IncidentsService {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    // Non-admins are scoped to their own neighborhood; admins see all.
    private assertNeighborhoodScope(
        incident: { neighborhoodId: string | null },
        user: AuthUser,
    ): void {
        if (
            user.role !== "admin" &&
            incident.neighborhoodId !== user.neighborhoodId
        ) {
            throw new ForbiddenException("Incident outside your neighborhood");
        }
    }

    private canModerate(user: AuthUser): boolean {
        return user.role === "admin" || user.role === "moderator";
    }

    // Moderation categories are confidential; 404 (not 403) hides their existence.
    private assertCategoryVisibility(
        incident: { category: string; createdBy: string },
        user: AuthUser,
    ): void {
        if (this.canModerate(user)) return;
        if (incident.category === "neighborhood") return;
        if (incident.createdBy === user.sub) return;
        throw new NotFoundException("Incident not found");
    }

    async findAll(user: AuthUser, query: ListIncidentsQuery, res: Response) {
        const { status, category, search, sort, order, page, limit, since } =
            query;
        const { limitNum, skip } = parsePagination(page, limit);

        // Non-admins see only their own neighborhood's incidents.
        const isAdmin = user.role === "admin";
        if (!isAdmin && !user.neighborhoodId) return [];

        const conditions = [isNull(schema.incidents.deletedAt)];
        if (!isAdmin) {
            conditions.push(
                eq(
                    schema.incidents.neighborhoodId,
                    user.neighborhoodId as string,
                ),
            );
        }
        if (!this.canModerate(user)) {
            // Residents see neighborhood incidents plus their own submissions.
            const visible = or(
                eq(schema.incidents.category, "neighborhood"),
                eq(schema.incidents.createdBy, user.sub),
            );
            if (visible) conditions.push(visible);
        }
        if (status) {
            if (
                !VALID_STATUSES.includes(
                    status as (typeof VALID_STATUSES)[number],
                )
            ) {
                throw new BadRequestException(`Invalid status: ${status}`);
            }
            conditions.push(eq(schema.incidents.status, status));
        }
        if (typeof category === "string" && category) {
            conditions.push(eq(schema.incidents.category, category));
        }
        if (typeof search === "string" && search.trim()) {
            const term = `%${escapeLike(search.trim())}%`;
            const bySearch = or(
                ilike(schema.incidents.title, term),
                ilike(schema.incidents.description, term),
            );
            if (bySearch) conditions.push(bySearch);
        }
        if (since) {
            // Delta sync for the desktop client; a full pull omits this parameter.
            const sinceDate = new Date(since);
            if (Number.isNaN(sinceDate.getTime())) {
                throw new BadRequestException(`Invalid since: ${since}`);
            }
            conditions.push(gt(schema.incidents.updatedAt, sinceDate));
        }

        const where = and(...conditions);
        const sortMap = {
            createdAt: schema.incidents.createdAt,
            updatedAt: schema.incidents.updatedAt,
            status: schema.incidents.status,
        } as const;
        const { field, direction } = resolveSort(
            sort,
            order,
            ["createdAt", "updatedAt", "status"] as const,
            "createdAt",
        );
        const col = sortMap[field];

        const [rows, [{ value: total }]] = await Promise.all([
            this.db
                .select()
                .from(schema.incidents)
                .where(where)
                .orderBy(direction === "asc" ? asc(col) : desc(col))
                .offset(skip)
                .limit(limitNum),
            this.db
                .select({ value: count() })
                .from(schema.incidents)
                .where(where),
        ]);
        setPageHeaders(res, Number(total), limitNum);
        return rows;
    }

    async findOne(id: string, user: AuthUser) {
        const [incident] = await this.db
            .select()
            .from(schema.incidents)
            .where(
                and(
                    eq(schema.incidents.id, id),
                    isNull(schema.incidents.deletedAt),
                ),
            );

        if (!incident) throw new NotFoundException("Incident not found");
        this.assertNeighborhoodScope(incident, user);
        this.assertCategoryVisibility(incident, user);
        return incident;
    }

    create(dto: CreateIncidentDto, user: AuthUser) {
        // Anti-spoofing: only admins may target another neighborhood.
        const neighborhoodId =
            user.role === "admin"
                ? (dto.neighborhoodId ?? user.neighborhoodId ?? null)
                : (user.neighborhoodId ?? null);
        return this.db
            .insert(schema.incidents)
            .values({
                title: dto.title,
                description: dto.description,
                neighborhoodId,
                lat: dto.lat,
                lng: dto.lng,
                createdBy: user.sub,
                status: "open",
                category: dto.category ?? "neighborhood",
            })
            .returning();
    }

    async updateStatus(
        id: string,
        dto: UpdateIncidentStatusDto,
        user: AuthUser,
    ) {
        const [incident] = await this.db
            .select()
            .from(schema.incidents)
            .where(
                and(
                    eq(schema.incidents.id, id),
                    isNull(schema.incidents.deletedAt),
                ),
            );

        if (!incident) throw new NotFoundException("Incident not found");
        this.assertNeighborhoodScope(incident, user);

        const allowed = VALID_TRANSITIONS[incident.status] ?? [];
        if (!allowed.includes(dto.status)) {
            throw new BadRequestException(
                `Invalid transition: ${incident.status} → ${dto.status}`,
            );
        }

        const [updated] = await this.db
            .update(schema.incidents)
            .set({ status: dto.status, updatedAt: new Date() })
            .where(
                and(
                    eq(schema.incidents.id, id),
                    eq(schema.incidents.status, incident.status),
                    isNull(schema.incidents.deletedAt),
                ),
            )
            .returning();

        if (!updated)
            throw new BadRequestException(
                "Concurrent update detected, please retry",
            );
        return updated;
    }

    async remove(id: string, user: AuthUser) {
        const [incident] = await this.db
            .select()
            .from(schema.incidents)
            .where(
                and(
                    eq(schema.incidents.id, id),
                    isNull(schema.incidents.deletedAt),
                ),
            );

        if (!incident) throw new NotFoundException("Incident not found");
        this.assertNeighborhoodScope(incident, user);

        await this.db
            .update(schema.incidents)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(schema.incidents.id, id));

        return { success: true };
    }

    async sync(dto: SyncIncidentsDto, user: AuthUser) {
        const isAdmin = user.role === "admin";
        const isModerator = user.role === "moderator";
        const canModerate = isAdmin || isModerator;
        // Scope items by role; out-of-scope items go to skippedIds. Items
        // without a neighborhood (the desktop payload) count as the pusher's own.
        const allowedItems = isAdmin
            ? dto.incidents
            : isModerator
              ? dto.incidents.filter(
                    (item) =>
                        (item.neighborhoodId ?? user.neighborhoodId) ===
                        user.neighborhoodId,
                )
              : dto.incidents.filter((item) => item.createdBy === user.sub);

        if (allowedItems.length === 0)
            return {
                upserted: 0,
                skipped: dto.incidents.length,
                skippedIds: dto.incidents.map((item) => item.id),
            };

        // Residents can't choose status or neighborhood: forced to their own,
        // status open. Missing neighborhoods fall back to the pusher's quartier
        // so desktop-created incidents stay visible to the neighborhood.
        const upsert = this.db.insert(schema.incidents).values(
            allowedItems.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                status: canModerate ? (item.status ?? "open") : "open",
                createdBy: canModerate ? item.createdBy : user.sub,
                neighborhoodId: canModerate
                    ? (item.neighborhoodId ?? user.neighborhoodId ?? null)
                    : (user.neighborhoodId ?? null),
                lat: item.lat,
                lng: item.lng,
            })),
        );

        // Payloads without coordinates (the desktop never sends any) must not
        // wipe the pins stored by the web clients.
        const baseConflictUpdateSet = {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            lat: sql`coalesce(excluded.lat, ${schema.incidents.lat})`,
            lng: sql`coalesce(excluded.lng, ${schema.incidents.lng})`,
            updatedAt: new Date(),
        };
        // Residents must not overwrite the status of an existing row, and
        // moderation follows the same state machine as PATCH: an invalid
        // transition keeps the stored status instead of applying a backdoor.
        const transitionArms = Object.entries(VALID_TRANSITIONS).flatMap(
            ([from, targets]) =>
                targets.map(
                    (target) =>
                        sql`when ${schema.incidents.status} = ${from} and excluded.status = ${target} then excluded.status`,
                ),
        );
        const clampedStatus = sql.join(
            [
                sql`case`,
                ...transitionArms,
                sql`else ${schema.incidents.status} end`,
            ],
            sql` `,
        );
        const conflictUpdateSet = canModerate
            ? { ...baseConflictUpdateSet, status: clampedStatus }
            : baseConflictUpdateSet;

        // Restrict which existing rows each role may update.
        const conflictWhere = isAdmin
            ? undefined
            : isModerator
              ? eq(
                    schema.incidents.neighborhoodId,
                    user.neighborhoodId as string,
                )
              : eq(schema.incidents.createdBy, user.sub);

        const upsertedRows: { id: string }[] = await upsert
            .onConflictDoUpdate({
                target: schema.incidents.id,
                set: conflictUpdateSet,
                ...(conflictWhere ? { where: conflictWhere } : {}),
            })
            .returning({ id: schema.incidents.id });

        const upsertedIds = new Set(upsertedRows.map((row) => row.id));
        return {
            upserted: upsertedRows.length,
            skipped: dto.incidents.length - upsertedRows.length,
            skippedIds: dto.incidents
                .map((item) => item.id)
                .filter((id) => !upsertedIds.has(id)),
        };
    }
}
