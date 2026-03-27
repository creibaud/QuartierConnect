import { Controller, Get, Query } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { Roles } from "src/common/decorators/roles.decorator";
import { AdminService } from "src/modules/admin/admin.service";

@ApiTags("Admin")
@Controller("admin")
@ApiBearerAuth("access-token")
@Roles("admin")
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

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
