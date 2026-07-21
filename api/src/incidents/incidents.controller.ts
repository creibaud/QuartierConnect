import {
    Body,
    Controller,
    Delete,
    Get,
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
import type { Response } from "express";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import { IncidentDto, SyncResultDto } from "./dto/incident-response.dto";
import { SyncIncidentsDto } from "./dto/sync-incident.dto";
import { UpdateIncidentStatusDto } from "./dto/update-incident-status.dto";
import { IncidentsService } from "./incidents.service";

interface AuthRequest {
    user: { sub: string; role: string; neighborhoodId?: string | null };
}

@ApiTags("Incidents")
@ApiBearerAuth()
@Controller("incidents")
@UseGuards(JwtAuthGuard)
export class IncidentsController {
    constructor(private readonly incidentsService: IncidentsService) {}

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
        return this.incidentsService.findAll(
            req.user,
            { status, category, search, sort, order, page, limit, since },
            res,
        );
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
    findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.incidentsService.findOne(id, req.user);
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
        return this.incidentsService.create(dto, req.user);
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
    updateStatus(
        @Param("id") id: string,
        @Body() dto: UpdateIncidentStatusDto,
        @Request() req: AuthRequest,
    ) {
        return this.incidentsService.updateStatus(id, dto, req.user);
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
    remove(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.incidentsService.remove(id, req.user);
    }

    @Post("sync")
    @ApiOperation({
        summary: "Sync incidents from the Java Desktop client",
        description:
            "Bulk upsert of incidents. Residents can only upsert incidents whose `createdBy` matches the JWT's UUID; their items are forced into their own neighborhood with status `open` and cannot change the status of existing rows (the state machine is moderator-only, as with PATCH /incidents/:id/status). Moderators and admins can upsert incidents owned by anyone (the original owner is preserved on update); their status updates follow the same transition rules as PATCH — an invalid transition keeps the stored status. Items without a `neighborhoodId` land in the pusher's own neighborhood, and payloads without coordinates keep the stored `lat`/`lng`. Items not upserted are reported in `skippedIds`; the desktop client drops the refused local change and restores the server version on the next pull.",
    })
    @ApiResponse({ status: 201, type: SyncResultDto })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    sync(@Body() dto: SyncIncidentsDto, @Request() req: AuthRequest) {
        return this.incidentsService.sync(dto, req.user);
    }
}
