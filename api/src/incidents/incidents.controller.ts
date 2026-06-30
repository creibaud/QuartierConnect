import {
    BadRequestException,
    Body,
    Controller,
    Delete,
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
import { and, desc, eq, isNull, sql } from "drizzle-orm";
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
    user: { sub: string; role: string };
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
    @ApiResponse({
        status: 200,
        type: [IncidentDto],
        description: "Paginated array of incidents",
    })
    @ApiResponse({ status: 400, description: "Invalid status" })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    findAll(
        @Query("status") status?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
    ) {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const conditions = [isNull(schema.incidents.deletedAt)];
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
    async findOne(@Param("id") id: string) {
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
        return incident;
    }

    @Post()
    @ApiOperation({
        summary: "Create an incident",
        description:
            "Creates an incident with the initial status `open`. The `createdBy` field is automatically populated from the JWT.",
    })
    @ApiResponse({
        status: 201,
        type: [IncidentDto],
        description: "Incident created",
    })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    create(@Body() dto: CreateIncidentDto, @Request() req: AuthRequest) {
        return this.db
            .insert(schema.incidents)
            .values({
                title: dto.title,
                description: dto.description,
                neighborhoodId: dto.neighborhoodId,
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
    async remove(@Param("id") id: string) {
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
            "Bulk upsert of incidents. Only incidents whose `createdBy` matches the JWT's UUID are processed; the others are silently ignored. The status is always forced to `open` on initial insertion (LWW: status transitions go through `PATCH /:id/status`).",
    })
    @ApiResponse({ status: 201, type: SyncResultDto })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    async sync(@Body() dto: SyncIncidentsDto, @Request() req: AuthRequest) {
        const ownItems = dto.incidents.filter(
            (item) => item.createdBy === req.user.sub,
        );

        if (ownItems.length === 0)
            return { upserted: 0, skipped: dto.incidents.length };

        await this.db
            .insert(schema.incidents)
            .values(
                ownItems.map((item) => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    status: item.status ?? "open",
                    createdBy: req.user.sub,
                    neighborhoodId: item.neighborhoodId,
                    lat: item.lat,
                    lng: item.lng,
                })),
            )
            .onConflictDoUpdate({
                target: schema.incidents.id,
                set: {
                    title: sql`excluded.title`,
                    description: sql`excluded.description`,
                    status: sql`excluded.status`,
                    lat: sql`excluded.lat`,
                    lng: sql`excluded.lng`,
                    updatedAt: new Date(),
                },
                where: eq(schema.incidents.createdBy, req.user.sub),
            })
            .returning();

        return {
            upserted: ownItems.length,
            skipped: dto.incidents.length - ownItems.length,
        };
    }
}
