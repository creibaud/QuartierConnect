import type { UUID } from "node:crypto";
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import { User } from "src/database/drizzle/schema";
import {
    UpdateUserDto,
    UpdateUserRoleDto,
    UpdateUserStatusDto,
} from "src/modules/users/dto/update-user.dto";
import { UserQueryDto } from "src/modules/users/dto/user-query.dto";
import { UserService } from "src/modules/users/user.service";

const USER_EXAMPLE = {
    id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    email: "jean.dupont@example.com",
    firstName: "Jean",
    lastName: "Dupont",
    role: "resident",
    isActive: true,
    balance: "5.00",
    createdAt: "2026-03-27T10:00:00.000Z",
    updatedAt: "2026-03-27T10:00:00.000Z",
};

@ApiTags("Users")
@Controller("users")
@ApiBearerAuth("access-token")
export class UsersController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @Roles("admin")
    @ApiOperation({ summary: "List all users" })
    @ApiResponse({
        status: 200,
        description: "Paginated user list",
        schema: {
            example: {
                data: [USER_EXAMPLE],
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    findAll(@Query() query: UserQueryDto) {
        return this.userService.findAll(query);
    }

    @Get("me/profile")
    @ApiOperation({ summary: "Get my profile" })
    @ApiResponse({
        status: 200,
        description: "User profile",
        schema: { example: USER_EXAMPLE },
    })
    getMyProfile(@CurrentUser() user: Omit<User, "password">) {
        return this.userService.getMyProfile(user.id as UUID);
    }

    @Patch("me/profile")
    @ApiOperation({ summary: "Update my profile" })
    @ApiResponse({
        status: 200,
        description: "Profile updated",
        schema: { example: USER_EXAMPLE },
    })
    updateMyProfile(
        @CurrentUser() user: Omit<User, "password">,
        @Body() dto: UpdateUserDto,
    ) {
        return this.userService.updateMyProfile(user.id as UUID, dto);
    }

    @Get("me/balance")
    @ApiOperation({ summary: "Get my balance" })
    @ApiResponse({
        status: 200,
        description: "Current balance",
        schema: {
            example: {
                userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
                balance: "5.00",
            },
        },
    })
    getBalance(@CurrentUser() user: Omit<User, "password">) {
        return this.userService.getBalance(user.id as UUID);
    }

    @Get("me/export")
    @ApiOperation({ summary: "Export my personal data (RGPD)" })
    @ApiResponse({
        status: 200,
        description: "Personal data export",
        schema: {
            example: {
                exportedAt: "2026-03-27T10:00:00.000Z",
                profile: {
                    id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
                    email: "jean.dupont@example.com",
                    firstName: "Jean",
                },
                quartierAssignment: {
                    userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
                    quartierId: "a3bb189e-8bf9-3888-9912-ace4e6543002",
                    joinedAt: "2026-03-27T10:00:00.000Z",
                },
            },
        },
    })
    exportMyData(@CurrentUser() user: Omit<User, "password">) {
        return this.userService.exportMyData(user.id as UUID);
    }

    @Delete("me")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Delete my account (RGPD right to erasure)" })
    @ApiResponse({
        status: 200,
        description: "Account deleted and anonymized",
        schema: { example: { message: "Account deleted" } },
    })
    deleteMyAccount(@CurrentUser() user: Omit<User, "password">) {
        return this.userService.deleteMyAccount(user.id as UUID);
    }

    @Get(":id")
    @Roles("admin")
    @ApiOperation({ summary: "Get user by ID" })
    @ApiResponse({
        status: 200,
        description: "User found",
        schema: { example: USER_EXAMPLE },
    })
    @ApiResponse({
        status: 404,
        description: "User not found",
        schema: {
            example: {
                statusCode: 404,
                message: "User not found",
                error: "Not Found",
            },
        },
    })
    findOne(@Param("id", ParseUUIDPipe) id: UUID) {
        return this.userService.findOne(id);
    }

    @Patch(":id/role")
    @Roles("admin")
    @ApiOperation({ summary: "Update user role" })
    @ApiResponse({
        status: 200,
        description: "Role updated",
        schema: { example: USER_EXAMPLE },
    })
    @ApiResponse({
        status: 403,
        description: "Cannot change a super_admin",
        schema: {
            example: {
                statusCode: 403,
                message: "Cannot change a super_admin",
                error: "Forbidden",
            },
        },
    })
    updateRole(
        @Param("id", ParseUUIDPipe) id: UUID,
        @Body() dto: UpdateUserRoleDto,
    ) {
        return this.userService.updateRole(id, dto);
    }

    @Patch(":id/status")
    @Roles("admin")
    @ApiOperation({ summary: "Activate or deactivate user" })
    @ApiResponse({
        status: 200,
        description: "Status updated",
        schema: { example: USER_EXAMPLE },
    })
    @ApiResponse({
        status: 403,
        description: "Cannot deactivate a super_admin",
        schema: {
            example: {
                statusCode: 403,
                message: "Cannot deactivate a super_admin",
                error: "Forbidden",
            },
        },
    })
    updateStatus(
        @Param("id", ParseUUIDPipe) id: UUID,
        @Body() dto: UpdateUserStatusDto,
    ) {
        return this.userService.updateStatus(id, dto);
    }
}
