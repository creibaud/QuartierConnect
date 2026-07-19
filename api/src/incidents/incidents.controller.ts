import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Inject,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Request,
    Res,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
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
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
    escapeLike,
    parsePagination,
    resolveSort,
    setPageHeaders,
} from "../common/pagination";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import { IncidentDto, SyncResultDto } from "./dto/incident-response.dto";
import { SyncIncidentsDto } from "./dto/sync-incident.dto";
import { UpdateIncidentStatusDto } from "./dto/update-incident-status.dto";

const VALID_TRANSITIONS: Record<string, string[]> = {
    open: ["in_progress"],
    in_progress: ["resolved"],
    resolved: [],
};

const VALID_STATUSES = ["open", "in_progress", "resolved"] as const;

interface AuthRequest {
    user: { sub: string; role: string; neighborhoodId?: string | null };
}

@ApiTags("Incidents")
@ApiBearerAuth()
@Controller("incidents")
@UseGuards(JwtAuthGuard)
export class IncidentsController {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    // Non-admins are scoped to their own neighborhood; admins see all.
    private assertNeighborhoodScope(
        incident: { neighborhoodId: string | null },
        req: AuthRequest,
    ): void {
        if (
            req.user.role !== "admin" &&
            incident.neighborhoodId !== req.user.neighborhoodId
        ) {
            throw new ForbiddenException("Incident outside your neighborhood");
        }
    }

    private canModerate(req: AuthRequest): boolean {
        return req.user.role === "admin" || req.user.role === "moderator";
    }

    // Moderation categories are confidential; 404 (not 403) hides their existence.
    private assertCategoryVisibility(
        incident: { category: string; createdBy: string },
        req: AuthRequest,
    ): void {
        if (this.canModerate(req)) return;
        if (incident.category === "neighborhood") return;
        if (incident.createdBy === req.user.sub) return;
        throw new NotFoundException("Incident not found");
    }

    @Get()
    @ApiOperation({
        summary: "List incidents",
        description:
            "Returns the paginated list of non-deleted incidents, sorted by creation date in descending order.",
    })
    @ApiQuery({
        name: "status",
        required: false,
        enum: ["open", "in_progress", "resolved"],
        description: "Filter by status",
    })
    @ApiQuery({
        name: "category",
        required: false,
        enum: ["neighborhood", "reporting", "bug"],
        description: "Filter by category",
    })
    @ApiQuery({
        name: "search",
        required: false,
        example: "poutre",
        description: "Case-insensitive substring on title or description",
    })
    @ApiQuery({
        name: "sort",
        required: false,
        enum: ["createdAt", "updatedAt", "status"],
        description: "Sort field (default: createdAt)",
    })
    @ApiQuery({
        name: "order",
        required: false,
        enum: ["asc", "desc"],
        description: "Sort direction (default: desc)",
    })
    @ApiQuery({
        name: "page",
        required: false,
        example: "1",
        description: "Page (default: 1)",
    })
    @ApiQuery({
        name: "limit",
        required: false,
        example: "20",
        description: "Results per page (max 100, default: 20)",
    })
    @ApiQuery({
        name: "since",
        required: false,
        example: "2026-07-01T00:00:00.000Z",
        description:
            "Only incidents updated after this ISO timestamp (delta sync)",
    })
    @ApiResponse({
        status: 200,
        type: [IncidentDto],
        description: "Paginated array of incidents",
    })
    @ApiResponse({ status: 400, description: "Invalid status or since" })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    async findAll(
        // @Res goes first: a required param can't follow optional @Query params (TS1016).
        @Res({ passthrough: true }) res: Response,
        @Query("status") status?: string,
        @Query("category") category?: string,
        @Query("search") search?: string,
        @Query("sort") sort?: string,
        @Query("order") order?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
        @Query("since") since?: string,
        @Request() req: AuthRequest = { user: { sub: "", role: "" } },
    ) {
        const { limitNum, skip } = parsePagination(page, limit);

        // Non-admins see only their own neighborhood's incidents.
        const isAdmin = req.user.role === "admin";
        if (!isAdmin && !req.user.neighborhoodId) return [];

        const conditions = [isNull(schema.incidents.deletedAt)];
        if (!isAdmin) {
            conditions.push(
                eq(
                    schema.incidents.neighborhoodId,
                    req.user.neighborhoodId as string,
                ),
            );
        }
        if (!this.canModerate(req)) {
            // Residents see neighborhood incidents plus their own submissions.
            const visible = or(
                eq(schema.incidents.category, "neighborhood"),
                eq(schema.incidents.createdBy, req.user.sub),
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

    @Get(":id")
    @ApiOperation({ summary: "Incident details" })
    @ApiParam({
        name: "id",
        description: "Incident UUID",
        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    })
    @ApiResponse({ status: 200, type: IncidentDto })
    @ApiResponse({
        status: 404,
        description: "Incident not found or deleted",
    })
    async findOne(@Param("id") id: string, @Request() req: AuthRequest) {
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
        this.assertNeighborhoodScope(incident, req);
        this.assertCategoryVisibility(incident, req);
        return incident;
    }

    @Post()
    @ApiOperation({
        summary: "Create an incident",
        description:
            "Creates an incident with the initial status `open`. The `createdBy` field is automatically populated from the JWT. For non-admin callers the provided `neighborhoodId` is ignored and replaced by the caller's own neighborhood.",
    })
    @ApiResponse({
        status: 201,
        type: [IncidentDto],
        description: "Incident created",
    })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    create(@Body() dto: CreateIncidentDto, @Request() req: AuthRequest) {
        // Anti-spoofing: only admins may target another neighborhood.
        const neighborhoodId =
            req.user.role === "admin"
                ? (dto.neighborhoodId ?? req.user.neighborhoodId ?? null)
                : (req.user.neighborhoodId ?? null);
        return this.db
            .insert(schema.incidents)
            .values({
                title: dto.title,
                description: dto.description,
                neighborhoodId,
                lat: dto.lat,
                lng: dto.lng,
                createdBy: req.user.sub,
                status: "open",
                category: dto.category ?? "neighborhood",
            })
            .returning();
    }

    @Patch(":id/status")
    @UseGuards(RolesGuard)
    @Roles("moderator", "admin")
    @ApiOperation({
        summary: "Change an incident's status",
        description:
            "Strict state machine: open → in_progress → resolved. Any other transition returns 400. Protected: moderator or admin only.",
    })
    @ApiParam({ name: "id", description: "Incident UUID" })
    @ApiResponse({
        status: 200,
        type: IncidentDto,
        description: "Status updated",
    })
    @ApiResponse({
        status: 400,
        description:
            "Invalid transition or concurrent conflict (open→resolved is forbidden)",
    })
    @ApiResponse({
        status: 403,
        description: "Insufficient role (moderator/admin required)",
    })
    @ApiResponse({ status: 404, description: "Incident not found" })
    async updateStatus(
        @Param("id") id: string,
        @Body() dto: UpdateIncidentStatusDto,
        @Request() req: AuthRequest,
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
        this.assertNeighborhoodScope(incident, req);

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

    @Delete(":id")
    @UseGuards(RolesGuard)
    @Roles("moderator", "admin")
    @ApiOperation({
        summary: "Delete an incident (soft delete)",
        description:
            "Sets `deleted_at = NOW()` without changing the status. The incident disappears from all lists (`WHERE deleted_at IS NULL`) but remains in the database.",
    })
    @ApiParam({ name: "id", description: "Incident UUID" })
    @ApiResponse({
        status: 200,
        schema: { example: { success: true } },
        description: "Incident marked as deleted (deleted_at = NOW())",
    })
    @ApiResponse({
        status: 403,
        description: "Insufficient role (moderator/admin required)",
    })
    @ApiResponse({ status: 404, description: "Incident not found" })
    async remove(@Param("id") id: string, @Request() req: AuthRequest) {
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
        this.assertNeighborhoodScope(incident, req);

        await this.db
            .update(schema.incidents)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(schema.incidents.id, id));

        return { success: true };
    }

    @Post("sync")
    @ApiOperation({
        summary: "Sync incidents from the Java Desktop client",
        description:
            "Bulk upsert of incidents. Residents can only upsert incidents whose `createdBy` matches the JWT's UUID; their items are forced into their own neighborhood with status `open` and cannot change the status of existing rows (the state machine is moderator-only, as with PATCH /incidents/:id/status). Moderators and admins can upsert incidents owned by anyone (the original owner is preserved on update). Items not upserted are reported in `skippedIds` so the client keeps them pending.",
    })
    @ApiResponse({ status: 201, type: SyncResultDto })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    async sync(@Body() dto: SyncIncidentsDto, @Request() req: AuthRequest) {
        const isAdmin = req.user.role === "admin";
        const isModerator = req.user.role === "moderator";
        const canModerate = isAdmin || isModerator;
        // Scope items by role; out-of-scope items go to skippedIds.
        const allowedItems = isAdmin
            ? dto.incidents
            : isModerator
              ? dto.incidents.filter(
                    (item) => item.neighborhoodId === req.user.neighborhoodId,
                )
              : dto.incidents.filter((item) => item.createdBy === req.user.sub);

        if (allowedItems.length === 0)
            return {
                upserted: 0,
                skipped: dto.incidents.length,
                skippedIds: dto.incidents.map((item) => item.id),
            };

        // Residents can't choose status or neighborhood: forced to their own,
        // status open.
        const upsert = this.db.insert(schema.incidents).values(
            allowedItems.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                status: canModerate ? (item.status ?? "open") : "open",
                createdBy: canModerate ? item.createdBy : req.user.sub,
                neighborhoodId: canModerate
                    ? item.neighborhoodId
                    : (req.user.neighborhoodId ?? null),
                lat: item.lat,
                lng: item.lng,
            })),
        );

        const baseConflictUpdateSet = {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            lat: sql`excluded.lat`,
            lng: sql`excluded.lng`,
            updatedAt: new Date(),
        };
        // Residents must not overwrite the status of an existing row either.
        const conflictUpdateSet = canModerate
            ? { ...baseConflictUpdateSet, status: sql`excluded.status` }
            : baseConflictUpdateSet;

        // Restrict which existing rows each role may update.
        const conflictWhere = isAdmin
            ? undefined
            : isModerator
              ? eq(
                    schema.incidents.neighborhoodId,
                    req.user.neighborhoodId as string,
                )
              : eq(schema.incidents.createdBy, req.user.sub);

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
