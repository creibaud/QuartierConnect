import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import type { User } from "src/database/drizzle/schema";
import { SyncDeltaQueryDto } from "src/modules/sync/dto/sync-delta-query.dto";
import { SyncPushDto } from "src/modules/sync/dto/sync-push.dto";
import { SyncService } from "src/modules/sync/sync.service";

@ApiTags("Sync")
@Controller("sync")
@ApiBearerAuth("access-token")
@Roles("admin")
export class SyncController {
    constructor(private readonly syncService: SyncService) {}

    @Get("delta")
    @ApiOperation({ summary: "Get delta of changes since last sync" })
    @ApiResponse({
        status: 200,
        description: "Changed entities since lastSyncTimestamp",
        schema: {
            example: {
                incidents: [
                    {
                        id: "a3bb189e-8bf9-3888-9912-ace4e6543002",
                        title: "Rue barrée",
                        status: "open",
                        updatedAt: "2026-03-27T10:00:00.000Z",
                    },
                ],
                asOf: "2026-03-27T10:00:00.000Z",
            },
        },
    })
    getDelta(@Query() query: SyncDeltaQueryDto) {
        return this.syncService.getDelta(new Date(query.lastSyncTimestamp));
    }

    @Post("push")
    @ApiOperation({ summary: "Push client-side mutations to the server" })
    @ApiResponse({
        status: 201,
        description: "Sync result with applied/skipped/conflicts",
        schema: {
            example: {
                applied: 1,
                skipped: 0,
                conflicts: [],
            },
        },
    })
    pushMutations(@Body() dto: SyncPushDto, @CurrentUser() user: User) {
        return this.syncService.pushMutations(dto.mutations, user.id);
    }
}
