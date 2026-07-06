import {
    Body,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    Patch,
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
import { and, eq, ilike, ne, notInArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { UpdateRoleDto } from "./dto/update-role.dto";
import {
    NeighborDto,
    UserPublicDto,
    UserSearchResultDto,
} from "./dto/user-responses.dto";

interface AuthRequest {
    user: { sub: string; neighborhoodId?: string | null };
}

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_RESULTS = 10;
const MAX_NEIGHBOR_RESULTS = 20;
const EXCLUDED_NEIGHBOR_ROLES = ["banned", "deleted"];
const FALLBACK_NEIGHBOR_NAME = "Voisin";

function escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function fullNameColumn() {
    return sql`concat_ws(' ', ${schema.users.firstName}, ${schema.users.lastName})`;
}

function formatNeighborName(row: {
    firstName: string | null;
    lastName: string | null;
}): string {
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
    return name || FALLBACK_NEIGHBOR_NAME;
}

@ApiTags("Users (admin)")
@ApiBearerAuth()
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class UsersController {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    @Get("search")
    @Roles("resident", "moderator", "admin")
    @ApiOperation({
        summary: "Search users by email",
        description:
            "Returns up to 10 users whose email contains the query string, excluding the authenticated user. Available to any signed-in resident so they can pick a points-transfer recipient without knowing their UUID. Returns an empty list when the query is shorter than 2 characters.",
    })
    @ApiQuery({ name: "q", required: true, example: "bob" })
    @ApiResponse({ status: 200, type: [UserSearchResultDto] })
    searchByEmail(@Query("q") query = "", @Request() req: AuthRequest) {
        const term = query.trim();
        if (term.length < MIN_SEARCH_LENGTH) return [];

        const pattern = `%${escapeLikePattern(term)}%`;
        return this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
            })
            .from(schema.users)
            .where(
                and(
                    ilike(schema.users.email, pattern),
                    ne(schema.users.id, req.user.sub),
                ),
            )
            .limit(MAX_SEARCH_RESULTS);
    }

    @Get("neighbors")
    @Roles("resident", "moderator", "admin")
    @ApiOperation({
        summary: "List neighbors by name",
        description:
            "Returns up to 20 residents of the caller's neighborhood (id and display name only), excluding the caller and banned accounts. The optional search term filters on the full name. Returns an empty list when the caller has no neighborhood.",
    })
    @ApiQuery({ name: "search", required: false, example: "Alice" })
    @ApiResponse({ status: 200, type: [NeighborDto] })
    async findNeighbors(
        @Query("search") search = "",
        @Request() req: AuthRequest,
    ): Promise<NeighborDto[]> {
        const { sub, neighborhoodId } = req.user;
        if (!neighborhoodId) return [];

        const conditions = [
            eq(schema.users.neighborhoodId, neighborhoodId),
            ne(schema.users.id, sub),
            notInArray(schema.users.role, EXCLUDED_NEIGHBOR_ROLES),
        ];
        const term = search.trim();
        if (term.length > 0) {
            const pattern = `%${escapeLikePattern(term)}%`;
            conditions.push(ilike(fullNameColumn(), pattern));
        }

        const rows = await this.db
            .select({
                id: schema.users.id,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
            })
            .from(schema.users)
            .where(and(...conditions))
            .orderBy(schema.users.firstName, schema.users.lastName)
            .limit(MAX_NEIGHBOR_RESULTS);

        return rows.map((row) => ({
            id: row.id,
            name: formatNeighborName(row),
        }));
    }

    @Get()
    @ApiOperation({
        summary: "List users (admin)",
        description:
            "Returns the paginated list of users. Returned fields: id, email, role, createdAt. Sensitive fields (passwordHash, totpSecret, refreshTokenHash) are excluded.",
    })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({
        status: 200,
        type: [UserPublicDto],
        description: "Paginated list of users (without sensitive fields)",
    })
    @ApiResponse({
        status: 403,
        description: "Insufficient role (admin required)",
    })
    findAll(@Query("page") page = "1", @Query("limit") limit = "20") {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
                createdAt: schema.users.createdAt,
            })
            .from(schema.users)
            .offset(skip)
            .limit(limitNum);
    }

    @Patch(":id/role")
    @ApiOperation({
        summary: "Change a user's role (admin)",
        description:
            "Allows promoting, demoting or banning a user. Available roles: resident, moderator, admin, banned.",
    })
    @ApiParam({
        name: "id",
        description: "User UUID",
        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    })
    @ApiResponse({
        status: 200,
        type: UserPublicDto,
        description: "Updated user",
    })
    @ApiResponse({
        status: 403,
        description: "Insufficient role (admin required)",
    })
    @ApiResponse({ status: 404, description: "User not found" })
    async updateRole(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
        const [current] = await this.db
            .select({
                role: schema.users.role,
                previousRole: schema.users.previousRole,
            })
            .from(schema.users)
            .where(eq(schema.users.id, id));

        if (!current) throw new NotFoundException("User not found");

        let role = dto.role;
        let previousRole = current.previousRole;
        if (dto.role === "banned" && current.role !== "banned") {
            // Banning: remember the current role so it can be restored later
            previousRole = current.role;
        } else if (current.role === "banned" && dto.role !== "banned") {
            // Reactivation: restore the original role, not the requested default one
            role = current.previousRole ?? dto.role;
            previousRole = null;
        }

        const [updated] = await this.db
            .update(schema.users)
            .set({ role, previousRole, updatedAt: new Date() })
            .where(eq(schema.users.id, id))
            .returning({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
            });

        return updated;
    }
}
