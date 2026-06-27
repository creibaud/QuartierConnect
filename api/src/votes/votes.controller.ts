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
import { CastVoteDto } from "./dto/cast-vote.dto";
import {
    VoteActionResponseDto,
    VoteScoreResponseDto,
} from "./dto/vote-response.dto";
import { VoteTargetType } from "./schemas/vote.schema";
import { VotesService } from "./votes.service";

interface AuthRequest {
    user: { sub: string };
}

@ApiTags("Votes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("votes")
export class VotesController {
    constructor(private readonly votesService: VotesService) {}

    @Post()
    @ApiOperation({
        summary: "Vote (cast/toggle/change)",
        description:
            "Cast or remove a vote. Voting again with the same type removes the vote (toggle). Voting with a different type updates it. LikeDislike strategy for services/events, UpDown for incidents/comments.",
    })
    @ApiResponse({ status: 201, type: VoteActionResponseDto })
    @ApiResponse({
        status: 400,
        description:
            "Vote type not allowed for this target (e.g. UP on a service)",
    })
    cast(@Body() dto: CastVoteDto, @Request() req: AuthRequest) {
        return this.votesService.cast(dto, req.user.sub);
    }

    @Get("score")
    @ApiOperation({ summary: "Aggregated score for a target" })
    @ApiQuery({ name: "targetId", required: true })
    @ApiQuery({ name: "targetType", enum: VoteTargetType, required: true })
    @ApiResponse({ status: 200, type: VoteScoreResponseDto })
    getScore(
        @Query("targetId") targetId: string,
        @Query("targetType") targetType: VoteTargetType,
    ) {
        return this.votesService.getScore(targetId, targetType);
    }
}
