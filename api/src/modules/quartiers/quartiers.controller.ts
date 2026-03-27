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
import { AddMemberDto } from "src/modules/quartiers/dto/add-member.dto";
import { CreateQuartierDto } from "src/modules/quartiers/dto/create-quartier.dto";
import { QuartierQueryDto } from "src/modules/quartiers/dto/quartier-query.dto";
import { UpdateQuartierDto } from "src/modules/quartiers/dto/update-quartier.dto";
import { QuartiersService } from "src/modules/quartiers/quartiers.service";

const QUARTIER_EXAMPLE = {
    id: "a3bb189e-8bf9-3888-9912-ace4e6543002",
    name: "Belleville",
    description: "Un quartier animé au nord-est de Paris",
    mongoGeoId: "507f1f77bcf86cd799439011",
    adminUserId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    geojson: {
        type: "Polygon",
        coordinates: [
            [
                [2.38, 48.86],
                [2.4, 48.86],
                [2.4, 48.87],
                [2.38, 48.87],
                [2.38, 48.86],
            ],
        ],
    },
    createdAt: "2026-03-27T10:00:00.000Z",
    updatedAt: "2026-03-27T10:00:00.000Z",
};

const GEOJSON_CONFLICT = {
    statusCode: 409,
    message: "GeoJSON overlaps with an existing quartier",
    error: "Conflict",
};

@ApiTags("Quartiers")
@Controller("quartiers")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
export class QuartiersController {
    constructor(private readonly quartiersService: QuartiersService) {}

    @Post()
    @Roles("admin")
    @ApiOperation({ summary: "Create a new quartier" })
    @ApiResponse({
        status: 201,
        description: "Quartier created successfully",
        schema: { example: QUARTIER_EXAMPLE },
    })
    @ApiResponse({
        status: 409,
        description: "GeoJSON overlaps with existing quartier",
        schema: { example: GEOJSON_CONFLICT },
    })
    create(
        @CurrentUser() user: Omit<User, "password">,
        @Body() dto: CreateQuartierDto,
    ) {
        return this.quartiersService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: "List all quartiers" })
    @ApiResponse({
        status: 200,
        description: "Paginated quartier list",
        schema: {
            example: {
                data: [QUARTIER_EXAMPLE],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    findAll(@Query() query: QuartierQueryDto) {
        return this.quartiersService.findAll(query);
    }

    @Get("me")
    @ApiOperation({ summary: "Get my assigned quartier" })
    @ApiResponse({
        status: 200,
        description: "Current user's quartier",
        schema: { example: QUARTIER_EXAMPLE },
    })
    @ApiResponse({
        status: 404,
        description: "Not assigned to any quartier",
        schema: {
            example: {
                statusCode: 404,
                message: "Not assigned to any quartier",
                error: "Not Found",
            },
        },
    })
    getMyQuartier(@CurrentUser() user: Omit<User, "password">) {
        return this.quartiersService.getMyQuartier(user.id);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get quartier by ID" })
    @ApiResponse({
        status: 200,
        description: "Quartier details with GeoJSON",
        schema: { example: QUARTIER_EXAMPLE },
    })
    @ApiResponse({
        status: 404,
        description: "Quartier not found",
        schema: {
            example: {
                statusCode: 404,
                message: "Quartier not found",
                error: "Not Found",
            },
        },
    })
    findOne(@Param("id", ParseUUIDPipe) id: string) {
        return this.quartiersService.findOne(id);
    }

    @Patch(":id")
    @Roles("admin")
    @ApiOperation({ summary: "Update quartier metadata or geometry" })
    @ApiResponse({
        status: 200,
        description: "Quartier updated",
        schema: { example: QUARTIER_EXAMPLE },
    })
    @ApiResponse({
        status: 409,
        description: "GeoJSON overlaps with existing quartier",
        schema: { example: GEOJSON_CONFLICT },
    })
    update(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateQuartierDto,
    ) {
        return this.quartiersService.update(id, dto);
    }

    @Delete(":id")
    @Roles("admin")
    @ApiOperation({ summary: "Delete a quartier" })
    @ApiResponse({
        status: 200,
        description: "Quartier deleted",
        schema: { example: { message: "Quartier deleted" } },
    })
    @ApiResponse({
        status: 400,
        description: "Quartier still has members",
        schema: {
            example: {
                statusCode: 400,
                message: "Quartier still has members",
                error: "Bad Request",
            },
        },
    })
    delete(@Param("id", ParseUUIDPipe) id: string) {
        return this.quartiersService.delete(id);
    }

    @Post(":id/members")
    @Roles("admin")
    @ApiOperation({ summary: "Add a member to a quartier" })
    @ApiResponse({
        status: 201,
        description: "Member added",
        schema: {
            example: {
                userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
                quartierId: "a3bb189e-8bf9-3888-9912-ace4e6543002",
                joinedAt: "2026-03-27T10:00:00.000Z",
            },
        },
    })
    @ApiResponse({
        status: 409,
        description: "User already assigned to a quartier",
        schema: {
            example: {
                statusCode: 409,
                message: "User already assigned to a quartier",
                error: "Conflict",
            },
        },
    })
    addMember(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: AddMemberDto,
    ) {
        return this.quartiersService.addMember(id, dto);
    }

    @Delete(":id/members/:userId")
    @Roles("admin")
    @ApiOperation({ summary: "Remove a member from a quartier" })
    @ApiResponse({
        status: 200,
        description: "Member removed",
        schema: { example: { message: "Member removed" } },
    })
    removeMember(
        @Param("id", ParseUUIDPipe) id: string,
        @Param("userId", ParseUUIDPipe) userId: string,
    ) {
        return this.quartiersService.removeMember(id, userId);
    }

    @Get(":id/members")
    @Roles("admin")
    @ApiOperation({ summary: "List members of a quartier" })
    @ApiResponse({
        status: 200,
        description: "Paginated member list",
        schema: {
            example: {
                data: [
                    {
                        userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
                        quartierId: "a3bb189e-8bf9-3888-9912-ace4e6543002",
                        joinedAt: "2026-03-27T10:00:00.000Z",
                    },
                ],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    getMembers(
        @Param("id", ParseUUIDPipe) id: string,
        @Query() query: PaginationQueryDto,
    ) {
        return this.quartiersService.getMembers(id, query);
    }
}
