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
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
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
    @ApiResponse({
        status: 200,
        schema: {
            example: [
                {
                    type: "service",
                    id: "abc123",
                    name: "Bibliothèque municipale",
                    score: 3,
                    reason: "Service in your neighborhood",
                },
            ],
        },
    })
    getRecommendations(@Request() req: AuthRequest) {
        return this.socialService.getRecommendations(req.user.sub);
    }

    @Post("social/interest")
    @ApiOperation({
        summary: "Enregistrer l'intérêt pour un événement (alimente Neo4j)",
    })
    @ApiResponse({ status: 201, description: "Intérêt enregistré" })
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
