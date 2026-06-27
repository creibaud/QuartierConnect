import {
    Body,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    Patch,
    Query,
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
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { UserPublicDto } from "./dto/user-responses.dto";

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
        const [updated] = await this.db
            .update(schema.users)
            .set({ role: dto.role, updatedAt: new Date() })
            .where(eq(schema.users.id, id))
            .returning({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
            });

        if (!updated) throw new NotFoundException("User not found");
        return updated;
    }
}
