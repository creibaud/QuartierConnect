import {
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Request,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CommunityVotesService } from "./community-votes.service";
import { CastVoteDto } from "./dto/cast-vote.dto";
import {
    CommunityVoteDto,
    CommunityVoteResultsDto,
} from "./dto/community-vote-response.dto";
import { CreateCommunityVoteDto } from "./dto/create-community-vote.dto";

interface AuthRequest {
    user: { sub: string; role: string };
}

@ApiTags("Community Votes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("community-votes")
export class CommunityVotesController {
    constructor(
        private readonly communityVotesService: CommunityVotesService,
    ) {}

    @Post()
    @ApiOperation({
        summary: "Créer un vote communautaire",
        description:
            "Pour BINARY, passer options: [{id:'yes',label:'Oui'},{id:'no',label:'Non'}]. Pour SINGLE_CHOICE/MULTIPLE_CHOICE, libre. Pour WEIGHTED, les poids doivent totaliser 1.0.",
    })
    @ApiResponse({ status: 201, type: CommunityVoteDto })
    create(@Body() dto: CreateCommunityVoteDto, @Request() req: AuthRequest) {
        return this.communityVotesService.create(dto, req.user.sub);
    }

    @Get()
    @ApiOperation({ summary: "Lister les votes communautaires" })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({ status: 200, type: [CommunityVoteDto] })
    findAll(
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.communityVotesService.findAll(page, limit);
    }

    @Get(":id")
    @ApiOperation({ summary: "Détail d'un vote communautaire" })
    @ApiParam({ name: "id", description: "MongoDB ObjectId du vote" })
    @ApiResponse({ status: 200, type: CommunityVoteDto })
    @ApiResponse({ status: 404, description: "Vote introuvable" })
    findOne(@Param("id") id: string) {
        return this.communityVotesService.findOne(id);
    }

    @Post(":id/cast")
    @ApiOperation({
        summary: "Enregistrer un vote",
        description:
            "Le corps doit contenir `choices` (tableau d'ids d'options) et optionnellement `weights` pour WEIGHTED.",
    })
    @ApiParam({ name: "id", description: "MongoDB ObjectId du vote" })
    @ApiResponse({
        status: 201,
        type: CommunityVoteDto,
        description: "Vote enregistré",
    })
    @ApiResponse({
        status: 400,
        description: "Vote clôturé, choix invalide ou quorum déjà atteint",
    })
    @ApiResponse({ status: 409, description: "Utilisateur a déjà voté" })
    cast(
        @Param("id") id: string,
        @Body() dto: CastVoteDto,
        @Request() req: AuthRequest,
    ) {
        return this.communityVotesService.cast(id, dto, req.user.sub);
    }

    @Get(":id/results")
    @ApiOperation({ summary: "Résultats agrégés d'un vote" })
    @ApiParam({ name: "id", description: "MongoDB ObjectId du vote" })
    @ApiResponse({ status: 200, type: CommunityVoteResultsDto })
    getResults(@Param("id") id: string) {
        return this.communityVotesService.getResults(id);
    }

    @Post(":id/close")
    @ApiOperation({
        summary: "Clôturer un vote (créateur ou admin)",
        description:
            "Passe le statut en 'closed'. Seul le créateur ou un admin peut clôturer.",
    })
    @ApiParam({ name: "id", description: "MongoDB ObjectId du vote" })
    @ApiResponse({
        status: 201,
        type: CommunityVoteDto,
        description: "Vote clôturé",
    })
    @ApiResponse({
        status: 403,
        description: "Non autorisé (créateur ou admin uniquement)",
    })
    close(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.communityVotesService.close(
            id,
            req.user.sub,
            req.user.role,
        );
    }
}
