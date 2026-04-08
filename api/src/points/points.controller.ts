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
        summary: "Consulter son solde de points",
        description:
            "Retourne le solde courant de l'utilisateur authentifié. Crée un enregistrement à 0 si aucun solde n'existe encore (lazy init).",
    })
    @ApiResponse({ status: 200, type: PointsBalanceResponseDto })
    getBalance(@Request() req: AuthRequest) {
        return this.pointsService.getBalance(req.user.sub);
    }

    @Get("history")
    @ApiOperation({
        summary: "Historique des transactions de points",
        description:
            "Retourne les transactions (envoyées et reçues) de l'utilisateur authentifié, triées par date décroissante.",
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
        summary: "Transférer des points",
        description:
            "Transfère des points vers un autre utilisateur. La transaction est atomique (PostgreSQL ACID) : le solde de l'expéditeur est débité et celui du destinataire est crédité dans la même transaction. Échoue si le solde est insuffisant.",
    })
    @ApiResponse({ status: 201, type: TransferResponseDto })
    @ApiResponse({
        status: 400,
        description: "Solde insuffisant ou destinataire inexistant",
    })
    transfer(@Body() dto: TransferPointsDto, @Request() req: AuthRequest) {
        return this.pointsService.transfer(req.user.sub, dto);
    }
}
