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
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
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

    // Residents AND moderators only reach incidents in their own quartier;
    // admins moderate across every neighborhood.
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

    // Moderation categories (reporting, bug) are confidential: a resident
    // only ever sees neighborhood incidents plus their own submissions.
    // 404 (not 403) so the existence of a report is never revealed.
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
    findAll(
        @Query("status") status?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
        @Query("since") since?: string,
        // Default required by TS1016 (a required param can't follow optional
        // @Query params); the neighborhood guard below rejects an empty role.
        @Request() req: AuthRequest = { user: { sub: "", role: "" } },
    ) {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        // Only admins moderate across all neighborhoods; residents AND
        // moderators see only their own quartier's incidents.
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
            // Moderation categories stay confidential: residents see the
            // quartier's incidents plus their own reporting/bug submissions.
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
        if (since) {
            // Promised by the CDC for the desktop delta sync; a full pull is
            // simply the same query without the parameter.
            const sinceDate = new Date(since);
            if (Number.isNaN(sinceDate.getTime())) {
                throw new BadRequestException(`Invalid since: ${since}`);
            }
            conditions.push(gt(schema.incidents.updatedAt, sinceDate));
        }

        return this.db
            .select()
            .from(schema.incidents)
            .where(and(...conditions))
            .orderBy(desc(schema.incidents.createdAt))
            .offset(skip)
            .limit(limitNum);
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
        // Anti-spoofing: only admins may target another quartier; residents
        // and moderators always report into their own.
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
        // Admins moderate every neighborhood; moderators only their own quartier;
        // residents only their own incidents. Out-of-scope items fall into
        // skippedIds so the client keeps them pending (see response shape below).
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

        // Residents cannot drive the status state machine (moderator-only,
        // like PATCH /:id/status) nor plant an incident in another quartier:
        // their items always land in their own neighborhood with status open.
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

        // Admins update any row; moderators only rows already in their own
        // quartier (blocks spoofing another neighborhood's id); residents only
        // rows they own.
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
