import {
    Body,
    Controller,
    Get,
    Param,
    Put,
    Query,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import type { User } from "src/database/drizzle/schema";
import { SERVICE_CATEGORIES, type ServiceCategory } from "src/database/drizzle/schema";
import { AdminService } from "src/modules/admin/admin.service";
import { UpdatePointConfigDto } from "src/modules/admin/dto/update-point-config.dto";

@ApiTags("Admin")
@Controller("admin")
@ApiBearerAuth("access-token")
@Roles("admin")
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get("point-config")
    @ApiOperation({
        summary: "Get point configuration for all service categories",
    })
    @ApiResponse({
        status: 200,
        description: "Point config per category",
        schema: {
            example: {
                gardening: {
                    basePointsPerHour: 2,
                    multiplier: 1.0,
                    updatedAt: "2026-03-30T12:00:00.000Z",
                    updatedBy: null,
                },
                babysitting: {
                    basePointsPerHour: 2,
                    multiplier: 1.5,
                    updatedAt: "2026-03-30T12:00:00.000Z",
                    updatedBy: "550e8400-e29b-41d4-a716-446655440000",
                },
            },
        },
    })
    getPointConfig() {
        return this.adminService.getPointConfig();
    }

    @Put("point-config/:category")
    @ApiOperation({
        summary: "Update point multiplier for a service category",
    })
    @ApiParam({
        name: "category",
        enum: SERVICE_CATEGORIES,
        description: "Service category to configure",
    })
    @ApiResponse({
        status: 200,
        description: "Config updated",
        schema: {
            example: {
                category: "babysitting",
                basePointsPerHour: 2,
                multiplier: 1.5,
                updatedAt: "2026-03-30T12:00:00.000Z",
                updatedBy: "550e8400-e29b-41d4-a716-446655440000",
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: "Invalid category or values",
        schema: {
            example: {
                statusCode: 400,
                message: "Validation failed",
                error: "Bad Request",
            },
        },
    })
    updatePointConfig(
        @Param("category") category: ServiceCategory,
        @Body() dto: UpdatePointConfigDto,
        @CurrentUser() admin: User,
    ) {
        return this.adminService.updatePointConfig(category, dto, admin.id);
    }

    @Get("stats")
    @ApiOperation({ summary: "Get global platform statistics" })
    @ApiResponse({
        status: 200,
        description: "Global stats",
        schema: {
            example: {
                users: { total: 150, active: 140 },
                quartiers: 5,
                events: 42,
                services: 28,
                incidents: 13,
                messages: 1240,
            },
        },
    })
    getGlobalStats() {
        return this.adminService.getGlobalStats();
    }

    @Get("stats/events")
    @ApiOperation({ summary: "Get event statistics" })
    @ApiQuery({
        name: "period",
        enum: ["week", "month", "year"],
        required: false,
    })
    @ApiResponse({
        status: 200,
        description: "Event stats",
        schema: {
            example: {
                total: 42,
                byCategory: { social: 15, sport: 10, cultural: 8 },
                upcoming: 12,
            },
        },
    })
    getEventStats(@Query("period") period?: "week" | "month" | "year") {
        return this.adminService.getEventStats(period);
    }

    @Get("stats/services")
    @ApiOperation({ summary: "Get service statistics" })
    @ApiResponse({
        status: 200,
        description: "Service stats",
        schema: {
            example: {
                total: 28,
                byStatus: { open: 12, accepted: 8, completed: 6, cancelled: 2 },
                byCategory: { education: 10, garden: 5, transport: 4 },
            },
        },
    })
    getServiceStats() {
        return this.adminService.getServiceStats();
    }

    @Get("stats/messages")
    @ApiOperation({ summary: "Get message statistics" })
    @ApiResponse({
        status: 200,
        description: "Message stats",
        schema: {
            example: {
                totalMessages: 1240,
                totalChats: 87,
                averageMessagesPerChat: 14,
            },
        },
    })
    getMessageStats() {
        return this.adminService.getMessageStats();
    }

    @Get("stats/votes")
    @ApiOperation({ summary: "Get vote statistics" })
    @ApiResponse({
        status: 200,
        description: "Vote stats",
        schema: {
            example: {
                total: 15,
                active: 4,
                closed: 11,
                totalResponses: 320,
            },
        },
    })
    getVoteStats() {
        return this.adminService.getVoteStats();
    }

    @Get("stats/users")
    @ApiOperation({ summary: "Get user statistics" })
    @ApiResponse({
        status: 200,
        description: "User stats",
        schema: {
            example: {
                total: 150,
                active: 140,
                byRole: { resident: 130, admin: 18, super_admin: 2 },
                newThisMonth: 12,
            },
        },
    })
    getUserStats() {
        return this.adminService.getUserStats();
    }
}
