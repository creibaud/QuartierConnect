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
        summary: "Personalized recommendations (Neo4j)",
        description:
            "Returns recommended services and events based on the Neo4j graph. Returns [] if Neo4j is unavailable.",
    })
    @ApiResponse({ status: 200, type: [RecommendationItemDto] })
    getRecommendations(@Request() req: AuthRequest) {
        return this.socialService.getRecommendations(req.user.sub);
    }

    @Post("social/interest")
    @ApiOperation({
        summary: "Record interest in an event (deprecated)",
        deprecated: true,
        description:
            "Deprecated: use POST /events/:id/interest, which updates the Mongo interested count and writes the same Neo4j relationship. This endpoint only writes the Neo4j INTERESTED_IN / NOT_INTERESTED_IN relationship.",
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
            { interested: body.interested, source: "swipe" },
        );
    }
}
