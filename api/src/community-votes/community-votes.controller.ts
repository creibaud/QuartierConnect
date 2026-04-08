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
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CommunityVotesService } from "./community-votes.service";
import { CastVoteDto } from "./dto/cast-vote.dto";
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
    @ApiOperation({ summary: "Créer un vote communautaire" })
    @ApiResponse({ status: 201, description: "Vote créé" })
    create(@Body() dto: CreateCommunityVoteDto, @Request() req: AuthRequest) {
        return this.communityVotesService.create(dto, req.user.sub);
    }

    @Get()
    @ApiOperation({ summary: "Lister les votes communautaires" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    @ApiResponse({ status: 200, description: "Liste des votes" })
    findAll(
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.communityVotesService.findAll(page, limit);
    }

    @Get(":id")
    @ApiOperation({ summary: "Détail d'un vote" })
    @ApiResponse({ status: 200, description: "Vote trouvé" })
    @ApiResponse({ status: 404, description: "Vote introuvable" })
    findOne(@Param("id") id: string) {
        return this.communityVotesService.findOne(id);
    }

    @Post(":id/cast")
    @ApiOperation({ summary: "Voter" })
    @ApiResponse({ status: 201, description: "Vote enregistré" })
    @ApiResponse({ status: 400, description: "Vote terminé ou choix invalide" })
    @ApiResponse({ status: 409, description: "Déjà voté" })
    cast(
        @Param("id") id: string,
        @Body() dto: CastVoteDto,
        @Request() req: AuthRequest,
    ) {
        return this.communityVotesService.cast(id, dto, req.user.sub);
    }

    @Get(":id/results")
    @ApiOperation({ summary: "Résultats d'un vote" })
    @ApiResponse({ status: 200, description: "Résultats calculés" })
    getResults(@Param("id") id: string) {
        return this.communityVotesService.getResults(id);
    }

    @Post(":id/close")
    @ApiOperation({ summary: "Fermer un vote (créateur ou admin)" })
    @ApiResponse({ status: 201, description: "Vote fermé" })
    @ApiResponse({ status: 403, description: "Non autorisé" })
    close(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.communityVotesService.close(
            id,
            req.user.sub,
            req.user.role,
        );
    }
}
