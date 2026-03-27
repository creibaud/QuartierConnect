import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { User } from "src/database/drizzle/schema";
import { AddCommentDto } from "src/modules/incidents/dto/add-comment.dto";
import { CreateIncidentDto } from "src/modules/incidents/dto/create-incident.dto";
import { IncidentQueryDto } from "src/modules/incidents/dto/incident-query.dto";
import { UpdateIncidentDto } from "src/modules/incidents/dto/update-incident.dto";
import { IncidentsService } from "src/modules/incidents/incidents.service";

const INCIDENT_EXAMPLE = {
    id: "a3bb189e-8bf9-3888-9912-ace4e6543002",
    title: "Rue barrée",
    description: "La rue est bloquée par des travaux non signalés",
    status: "open",
    priority: "medium",
    creatorId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    createdAt: "2026-03-27T10:00:00.000Z",
    updatedAt: "2026-03-27T10:00:00.000Z",
};

const COMMENT_EXAMPLE = {
    id: "507f1f77bcf86cd799439011",
    incidentId: "a3bb189e-8bf9-3888-9912-ace4e6543002",
    authorId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    content: "Je confirme, c'est bloqué depuis ce matin",
    createdAt: "2026-03-27T10:00:00.000Z",
};

@ApiTags("Incidents")
@Controller("incidents")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
export class IncidentsController {
    constructor(private readonly incidentsService: IncidentsService) {}

    @Post()
    @ApiOperation({ summary: "Report a new incident" })
    @ApiResponse({
        status: 201,
        description: "Incident created",
        schema: { example: INCIDENT_EXAMPLE },
    })
    create(
        @CurrentUser() user: Omit<User, "password">,
        @Body() dto: CreateIncidentDto,
    ) {
        return this.incidentsService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: "List all incidents" })
    @ApiResponse({
        status: 200,
        description: "Paginated incident list",
        schema: {
            example: {
                data: [INCIDENT_EXAMPLE],
                meta: { total: 3, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    findAll(@Query() query: IncidentQueryDto) {
        return this.incidentsService.findAll(query);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get incident by ID" })
    @ApiResponse({
        status: 200,
        description: "Incident details",
        schema: { example: INCIDENT_EXAMPLE },
    })
    @ApiResponse({
        status: 404,
        description: "Incident not found",
        schema: {
            example: {
                statusCode: 404,
                message: "Incident not found",
                error: "Not Found",
            },
        },
    })
    findOne(@Param("id", ParseUUIDPipe) id: string) {
        return this.incidentsService.findOne(id);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update an incident" })
    @ApiResponse({
        status: 200,
        description: "Incident updated",
        schema: { example: INCIDENT_EXAMPLE },
    })
    @ApiResponse({
        status: 403,
        description: "Forbidden - not creator or admin",
        schema: {
            example: {
                statusCode: 403,
                message: "Forbidden resource",
                error: "Forbidden",
            },
        },
    })
    update(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: Omit<User, "password">,
        @Body() dto: UpdateIncidentDto,
    ) {
        return this.incidentsService.update(id, user.id, user.role, dto);
    }

    @Delete(":id")
    @Roles("admin")
    @ApiOperation({ summary: "Delete an incident" })
    @ApiResponse({
        status: 200,
        description: "Incident deleted",
        schema: { example: { message: "Incident deleted" } },
    })
    @ApiResponse({
        status: 403,
        description: "Admin only",
        schema: {
            example: {
                statusCode: 403,
                message: "Forbidden resource",
                error: "Forbidden",
            },
        },
    })
    delete(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: Omit<User, "password">,
    ) {
        return this.incidentsService.delete(id, user.role);
    }

    @Post(":id/comments")
    @ApiOperation({ summary: "Add a comment to an incident" })
    @ApiResponse({
        status: 201,
        description: "Comment added",
        schema: { example: COMMENT_EXAMPLE },
    })
    addComment(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: Omit<User, "password">,
        @Body() dto: AddCommentDto,
    ) {
        return this.incidentsService.addComment(id, user.id, dto);
    }

    @Get(":id/comments")
    @ApiOperation({ summary: "Get comments for an incident" })
    @ApiResponse({
        status: 200,
        description: "Paginated comment list",
        schema: {
            example: {
                data: [COMMENT_EXAMPLE],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    getComments(
        @Param("id", ParseUUIDPipe) id: string,
        @Query() query: PaginationQueryDto,
    ) {
        return this.incidentsService.getComments(id, query);
    }
}
