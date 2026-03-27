import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import type { User } from "src/database/drizzle/schema";
import { AdjustmentDto } from "src/modules/transactions/dto/adjustment.dto";
import { TransactionQueryDto } from "src/modules/transactions/dto/transaction-query.dto";
import { TransactionsService } from "src/modules/transactions/transactions.service";

const TRANSACTION_EXAMPLE = {
    id: "507f1f77bcf86cd799439011",
    fromUserId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    toUserId: "7ace8b71-3d2a-5e5b-0d23-55e5735f9g92",
    points: 2,
    type: "service",
    description: "Service completé",
    createdAt: "2026-03-27T10:00:00.000Z",
};

const PAGINATED_TRANSACTIONS = {
    data: [TRANSACTION_EXAMPLE],
    meta: { total: 5, page: 1, limit: 10, totalPages: 1 },
};

@ApiTags("Transactions")
@Controller("transactions")
@ApiBearerAuth("access-token")
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) {}

    @Get("me")
    @ApiOperation({ summary: "Get my transaction history" })
    @ApiResponse({
        status: 200,
        description: "Paginated transaction list",
        schema: { example: PAGINATED_TRANSACTIONS },
    })
    findMyHistory(
        @CurrentUser() user: User,
        @Query() query: TransactionQueryDto,
    ) {
        return this.transactionsService.findMyHistory(user.id, query);
    }

    @Get()
    @Roles("admin")
    @ApiOperation({ summary: "List all transactions (admin only)" })
    @ApiResponse({
        status: 200,
        description: "Paginated transaction list",
        schema: { example: PAGINATED_TRANSACTIONS },
    })
    @ApiResponse({
        status: 403,
        description: "Admin access required",
        schema: {
            example: {
                statusCode: 403,
                message: "Forbidden resource",
                error: "Forbidden",
            },
        },
    })
    findAll(@Query() query: TransactionQueryDto) {
        return this.transactionsService.findAll(query);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a transaction by ID" })
    @ApiResponse({
        status: 200,
        description: "Transaction found",
        schema: { example: TRANSACTION_EXAMPLE },
    })
    @ApiResponse({
        status: 404,
        description: "Transaction not found",
        schema: {
            example: {
                statusCode: 404,
                message: "Transaction not found",
                error: "Not Found",
            },
        },
    })
    findOne(@Param("id") id: string) {
        return this.transactionsService.findOne(id);
    }

    @Post("adjustment")
    @Roles("admin")
    @ApiOperation({
        summary: "Create a manual balance adjustment (admin only)",
    })
    @ApiResponse({
        status: 201,
        description: "Adjustment created",
        schema: {
            example: {
                ...TRANSACTION_EXAMPLE,
                type: "adjustment",
                description: "Ajustement manuel par l'admin",
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Admin access required",
        schema: {
            example: {
                statusCode: 403,
                message: "Forbidden resource",
                error: "Forbidden",
            },
        },
    })
    createAdjustment(@CurrentUser() user: User, @Body() dto: AdjustmentDto) {
        return this.transactionsService.createAdjustment(user.id, dto);
    }
}
