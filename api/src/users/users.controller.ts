import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Inject,
    NotFoundException,
    Param,
    Patch,
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
    ilike,
    ne,
    notInArray,
    or,
    sql,
    type SQL,
} from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Response } from "express";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
    parsePagination,
    resolveSort,
    setPageHeaders,
} from "../common/pagination";
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
// Banned and deleted accounts can neither receive points nor be written to,
// so offering them in any people picker would be a dead end.
const UNREACHABLE_ROLES = ["banned", "deleted"];
const FILTERABLE_ROLES = ["resident", "moderator", "admin", "banned"] as const;
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
        summary: "Search users by name or email",
        description:
            "Returns up to 10 users whose email, first name or last name contains the query string (case-insensitive), excluding the authenticated user and banned or deleted accounts. Available to any signed-in resident so they can pick a points-transfer recipient or a conversation partner without knowing their UUID. Returns an empty list when the query is shorter than 2 characters.",
    })
    @ApiQuery({ name: "q", required: true, example: "camille" })
    @ApiResponse({ status: 200, type: [UserSearchResultDto] })
    searchUsers(@Query("q") query = "", @Request() req: AuthRequest) {
        const term = query.trim();
        if (term.length < MIN_SEARCH_LENGTH) return [];

        const pattern = `%${escapeLikePattern(term)}%`;
        return this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
                avatarUrl: schema.users.avatarUrl,
            })
            .from(schema.users)
            .where(
                and(
                    or(
                        ilike(schema.users.email, pattern),
                        ilike(fullNameColumn(), pattern),
                    ),
                    ne(schema.users.id, req.user.sub),
                    notInArray(schema.users.role, UNREACHABLE_ROLES),
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
            notInArray(schema.users.role, UNREACHABLE_ROLES),
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
            "Returns the paginated list of users, filterable by email substring and role. Returned fields: id, email, role, createdAt. Sensitive fields (passwordHash, totpSecret, refreshTokenHash) are excluded.",
    })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiQuery({
        name: "search",
        required: false,
        example: "bob",
        description: "Email substring (case-insensitive)",
    })
    @ApiQuery({
        name: "role",
        required: false,
        enum: FILTERABLE_ROLES,
        description: "Filter by role (unknown values are ignored)",
    })
    @ApiQuery({
        name: "sort",
        required: false,
        enum: ["createdAt", "email", "role"],
        description: "Sort field (default: createdAt)",
    })
    @ApiQuery({
        name: "order",
        required: false,
        enum: ["asc", "desc"],
        description: "Sort direction (default: desc)",
    })
    @ApiResponse({
        status: 200,
        type: [UserPublicDto],
        description: "Paginated list of users (without sensitive fields)",
    })
    @ApiResponse({
        status: 403,
        description: "Insufficient role (admin required)",
    })
    async findAll(
        // @Res goes first: a required param can't follow optional @Query params (TS1016).
        @Res({ passthrough: true }) res: Response,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
        @Query("search") search = "",
        @Query("role") role = "",
        @Query("sort") sort?: string,
        @Query("order") order?: string,
    ) {
        const { limitNum, skip } = parsePagination(page, limit);
        // Filter server-side so search spans all users, not just loaded pages.
        const conditions: SQL[] = [];
        const term = search.trim();
        if (term.length > 0) {
            conditions.push(
                ilike(schema.users.email, `%${escapeLikePattern(term)}%`),
            );
        }
        if ((FILTERABLE_ROLES as readonly string[]).includes(role)) {
            conditions.push(eq(schema.users.role, role));
        }
        const where = conditions.length ? and(...conditions) : undefined;
        const sortMap = {
            createdAt: schema.users.createdAt,
            email: schema.users.email,
            role: schema.users.role,
        } as const;
        const { field, direction } = resolveSort(
            sort,
            order,
            ["createdAt", "email", "role"] as const,
            "createdAt",
        );
        const col = sortMap[field];
        const [rows, [{ value: total }]] = await Promise.all([
            this.db
                .select({
                    id: schema.users.id,
                    email: schema.users.email,
                    role: schema.users.role,
                    createdAt: schema.users.createdAt,
                })
                .from(schema.users)
                .where(where)
                // Secondary key keeps pagination stable when the sort field ties.
                .orderBy(
                    direction === "asc" ? asc(col) : desc(col),
                    schema.users.id,
                )
                .offset(skip)
                .limit(limitNum),
            this.db.select({ value: count() }).from(schema.users).where(where),
        ]);
        setPageHeaders(res, Number(total), limitNum);
        return rows;
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
        description:
            "Insufficient role (admin required), or the admin is trying to change their own role or ban themselves (code CANNOT_MODIFY_SELF)",
    })
    @ApiResponse({ status: 404, description: "User not found" })
    async updateRole(
        @Param("id") id: string,
        @Body() dto: UpdateRoleDto,
        @Request() req: AuthRequest,
    ) {
        if (id === req.user.sub) {
            throw new ForbiddenException({
                code: "CANNOT_MODIFY_SELF",
                message: "You cannot change your own role or ban yourself",
            });
        }

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
            // Remember the current role so a later reactivation can restore it.
            previousRole = current.role;
        } else if (current.role === "banned" && dto.role !== "banned") {
            // Restore the pre-ban role rather than the requested default.
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
