import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Request,
    UseGuards,
    ValidationPipe,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import {
    PointsBalanceResponseDto,
    PointsTransactionResponseDto,
    TransferResponseDto,
} from "./dto/points-responses.dto";
import { TransferPointsDto } from "./dto/transfer-points.dto";
import { PointsService } from "./points.service";

interface AuthRequest {
    user: { sub: string };
}

@ApiTags("Points")
@ApiBearerAuth()
@Controller("points")
@UseGuards(JwtAuthGuard)
export class PointsController {
    constructor(private readonly pointsService: PointsService) {}

    @Get("balance")
    @ApiOperation({
        summary: "Check your points balance",
        description:
            "Returns the current balance of the authenticated user (0 when the user has no balance row yet).",
    })
    @ApiResponse({ status: 200, type: PointsBalanceResponseDto })
    getBalance(@Request() req: AuthRequest) {
        return this.pointsService.getBalance(req.user.sub);
    }

    @Get("history")
    @ApiOperation({
        summary: "Points transaction history",
        description:
            "Returns the transactions (sent and received) of the authenticated user, sorted by date in descending order.",
    })
    @ApiResponse({ status: 200, type: [PointsTransactionResponseDto] })
    @ApiResponse({
        status: 400,
        description: "Invalid pagination (page must be >= 1, limit 1 to 100)",
    })
    getHistory(
        @Request() req: AuthRequest,
        @Query(new ValidationPipe({ transform: true, whitelist: true }))
        pagination: PaginationQueryDto,
    ) {
        return this.pointsService.getHistory(
            req.user.sub,
            pagination.page ?? 1,
            pagination.limit ?? 20,
        );
    }

    @Post("transfer")
    @ApiOperation({
        summary: "Transfer points",
        description:
            "Transfers points to another user. The transaction is atomic (PostgreSQL ACID): the sender's balance is debited and the recipient's balance is credited within the same transaction. Returns the created transaction and both updated balances. Fails if the balance is insufficient.",
    })
    @ApiResponse({ status: 201, type: TransferResponseDto })
    @ApiResponse({
        status: 400,
        description:
            "Insufficient balance, invalid amount or recipient does not exist",
    })
    transfer(@Body() dto: TransferPointsDto, @Request() req: AuthRequest) {
        return this.pointsService.transfer(req.user.sub, dto);
    }
}
