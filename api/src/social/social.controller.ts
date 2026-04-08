import {
    Body,
    Controller,
    Get,
    Post,
    Request,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
    RecommendationItemDto,
    RecordInterestBodyDto,
    RecordInterestResponseDto,
} from "./dto/social-responses.dto";
import { SocialService } from "./social.service";

interface AuthRequest {
    user: { sub: string };
}

@ApiTags("Social")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SocialController {
    constructor(private readonly socialService: SocialService) {}

    @Get("recommendations")
    @ApiOperation({
        summary: "Recommandations personnalisées (Neo4j)",
        description:
            "Retourne services et événements recommandés basés sur le graphe Neo4j. Retourne [] si Neo4j est indisponible.",
    })
    @ApiResponse({ status: 200, type: [RecommendationItemDto] })
    getRecommendations(@Request() req: AuthRequest) {
        return this.socialService.getRecommendations(req.user.sub);
    }

    @Post("social/interest")
    @ApiOperation({
        summary: "Enregistrer l'intérêt pour un événement (alimente Neo4j)",
        description:
            "Crée ou supprime une relation INTERESTED_IN dans Neo4j entre l'utilisateur et l'événement.",
    })
    @ApiBody({ type: RecordInterestBodyDto })
    @ApiResponse({ status: 201, type: RecordInterestResponseDto })
    recordInterest(
        @Body() body: { eventId: string; interested: boolean },
        @Request() req: AuthRequest,
    ) {
        return this.socialService.recordEventInterest(
            req.user.sub,
            body.eventId,
            body.interested,
        );
    }
}
