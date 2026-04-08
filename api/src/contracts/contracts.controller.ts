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
    @ApiOperation({ summary: "Lister mes contrats (créés ou à signer)" })
    @ApiResponse({ status: 200, description: "Liste des contrats" })
    findAll(@Request() req: AuthRequest) {
        return this.contractsService.findAll(req.user.sub);
    }

    @Get(":id")
    @ApiOperation({ summary: "Détail d'un contrat" })
    @ApiParam({ name: "id", description: "MongoDB ObjectId du contrat" })
    @ApiResponse({ status: 200, description: "Contrat trouvé" })
    @ApiResponse({ status: 403, description: "Accès refusé" })
    @ApiResponse({ status: 404, description: "Contrat introuvable" })
    findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.contractsService.findOne(id, req.user.sub);
    }

    @Post()
    @ApiOperation({ summary: "Créer un contrat (hash SHA-256 auto-calculé)" })
    @ApiResponse({ status: 201, description: "Contrat créé" })
    create(@Body() dto: CreateContractDto, @Request() req: AuthRequest) {
        return this.contractsService.create(dto, req.user.sub);
    }

    @Post(":id/sign")
    @ApiOperation({
        summary: "Signer un contrat avec validation TOTP",
        description:
            "Valide le code TOTP et ajoute la signature. Passe en statut SIGNED si tous les signataires ont signé.",
    })
    @ApiParam({ name: "id", description: "MongoDB ObjectId du contrat" })
    @ApiResponse({ status: 201, description: "Signature ajoutée" })
    @ApiResponse({ status: 400, description: "TOTP invalide ou déjà signé" })
    @ApiResponse({ status: 403, description: "Pas signataire de ce contrat" })
    sign(
        @Param("id") id: string,
        @Body() dto: SignContractDto,
        @Request() req: AuthRequest,
    ) {
        return this.contractsService.sign(id, req.user.sub, dto.totpCode);
    }
}
