import type { UUID } from "node:crypto";
import {
    Body,
    Controller,
    Get,
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

@ApiTags("Users")
@Controller("users")
@ApiBearerAuth("access-token")
export class UsersController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @Roles("admin")
    @ApiOperation({ summary: "List all users" })
    @ApiResponse({ status: 200, description: "Paginated user list" })
    findAll(@Query() query: UserQueryDto) {
        return this.userService.findAll(query);
    }

    @Get("me/profile")
    @ApiOperation({ summary: "Get my profile" })
    getMyProfile(@CurrentUser() user: Omit<User, "password">) {
        return this.userService.getMyProfile(user.id as UUID);
    }

    @Patch("me/profile")
    @ApiOperation({ summary: "Update my profile" })
    updateMyProfile(
        @CurrentUser() user: Omit<User, "password">,
        @Body() dto: UpdateUserDto,
    ) {
        return this.userService.updateMyProfile(user.id as UUID, dto);
    }

    @Get(":id")
    @Roles("admin")
    @ApiOperation({ summary: "Get user by ID" })
    @ApiResponse({ status: 404, description: "User not found" })
    findOne(@Param("id", ParseUUIDPipe) id: UUID) {
        return this.userService.findOne(id);
    }

    @Patch(":id/role")
    @Roles("admin")
    @ApiOperation({ summary: "Update user role" })
    @ApiResponse({ status: 403, description: "Cannot change a super_admin" })
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
        status: 403,
        description: "Cannot deactivate a super_admin",
    })
    updateStatus(
        @Param("id", ParseUUIDPipe) id: UUID,
        @Body() dto: UpdateUserStatusDto,
    ) {
        return this.userService.updateStatus(id, dto);
    }
}
