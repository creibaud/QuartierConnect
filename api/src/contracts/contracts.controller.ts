import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ContractsService } from "./contracts.service";
import { ContractDto } from "./dto/contract-response.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { SignContractDto } from "./dto/sign-contract.dto";

interface AuthRequest {
    user: { sub: string };
}

@ApiTags("Contracts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("contracts")
export class ContractsController {
    constructor(private readonly contractsService: ContractsService) {}

    @Get()
    @ApiOperation({
        summary: "Lister mes contrats (créés ou à signer)",
        description:
            "Retourne tous les contrats dont l'utilisateur est créateur ou signataire.",
    })
    @ApiResponse({ status: 200, type: [ContractDto] })
    findAll(@Request() req: AuthRequest) {
        return this.contractsService.findAll(req.user.sub);
    }

    @Get(":id")
    @ApiOperation({ summary: "Détail d'un contrat" })
    @ApiParam({ name: "id", description: "MongoDB ObjectId du contrat" })
    @ApiResponse({ status: 200, type: ContractDto })
    @ApiResponse({
        status: 403,
        description: "Accès refusé (créateur ou signataire uniquement)",
    })
    @ApiResponse({ status: 404, description: "Contrat introuvable" })
    findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.contractsService.findOne(id, req.user.sub);
    }

    @Post()
    @ApiOperation({
        summary: "Créer un contrat (hash SHA-256 auto-calculé)",
        description:
            "Crée un contrat. Le `contentHash` est calculé automatiquement (SHA-256 du champ `content`). Statut initial : PENDING_SIGNATURE.",
    })
    @ApiResponse({ status: 201, type: ContractDto })
    create(@Body() dto: CreateContractDto, @Request() req: AuthRequest) {
        return this.contractsService.create(dto, req.user.sub);
    }

    @Post(":id/sign")
    @ApiOperation({
        summary: "Signer un contrat avec validation TOTP",
        description:
            "Valide le code TOTP de l'utilisateur et ajoute sa signature. Passe automatiquement en statut SIGNED quand tous les signataires ont signé.",
    })
    @ApiParam({ name: "id", description: "MongoDB ObjectId du contrat" })
    @ApiResponse({
        status: 201,
        type: ContractDto,
        description: "Signature ajoutée",
    })
    @ApiResponse({
        status: 400,
        description:
            "Code TOTP invalide ou contrat déjà signé par cet utilisateur",
    })
    @ApiResponse({
        status: 403,
        description: "Utilisateur non listé comme signataire",
    })
    sign(
        @Param("id") id: string,
        @Body() dto: SignContractDto,
        @Request() req: AuthRequest,
    ) {
        return this.contractsService.sign(id, req.user.sub, dto.totpCode);
    }
}
