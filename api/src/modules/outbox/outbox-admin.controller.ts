import { BadRequestException, Controller, Post, Query } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { Roles } from "src/common/decorators/roles.decorator";
import { OutboxDispatcherService } from "src/modules/outbox/outbox-dispatcher.service";

@ApiTags("Admin")
@Controller("admin/outbox")
@ApiBearerAuth("access-token")
@Roles("admin")
export class OutboxAdminController {
    constructor(private readonly outboxDispatcher: OutboxDispatcherService) {}

    @Post("run")
    @ApiOperation({
        summary: "Trigger one manual outbox dispatch batch",
    })
    @ApiQuery({
        name: "limit",
        required: false,
        description: "Optional batch size (default: 50)",
    })
    @ApiResponse({
        status: 201,
        description: "Outbox batch triggered",
        schema: {
            example: {
                processed: 12,
            },
        },
    })
    async runBatch(@Query("limit") limit?: string) {
        if (limit === undefined) {
            return this.outboxDispatcher.dispatchPendingBatch();
        }

        const parsed = Number(limit);
        if (!Number.isInteger(parsed) || parsed < 1) {
            throw new BadRequestException("limit must be a positive integer");
        }

        return this.outboxDispatcher.dispatchPendingBatch(parsed);
    }
}
