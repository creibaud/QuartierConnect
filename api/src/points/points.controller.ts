import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Request,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
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
            "Returns the current balance of the authenticated user. Creates a record at 0 if no balance exists yet (lazy init).",
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
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({ status: 200, type: [PointsTransactionResponseDto] })
    getHistory(
        @Request() req: AuthRequest,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
    ) {
        return this.pointsService.getHistory(
            req.user.sub,
            parseInt(page),
            parseInt(limit),
        );
    }

    @Post("transfer")
    @ApiOperation({
        summary: "Transfer points",
        description:
            "Transfers points to another user. The transaction is atomic (PostgreSQL ACID): the sender's balance is debited and the recipient's balance is credited within the same transaction. Fails if the balance is insufficient.",
    })
    @ApiResponse({ status: 201, type: TransferResponseDto })
    @ApiResponse({
        status: 400,
        description: "Insufficient balance or recipient does not exist",
    })
    transfer(@Body() dto: TransferPointsDto, @Request() req: AuthRequest) {
        return this.pointsService.transfer(req.user.sub, dto);
    }
}
