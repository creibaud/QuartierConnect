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
        summary: "Create a community vote",
        description:
            "For BINARY, pass options: [{id:'yes',label:'Yes'},{id:'no',label:'No'}]. For SINGLE_CHOICE/MULTIPLE_CHOICE, options are free-form. For WEIGHTED, the weights must add up to 1.0.",
    })
    @ApiResponse({ status: 201, type: CommunityVoteDto })
    create(@Body() dto: CreateCommunityVoteDto, @Request() req: AuthRequest) {
        return this.communityVotesService.create(dto, req.user.sub);
    }

    @Get()
    @ApiOperation({ summary: "List community votes" })
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
    @ApiOperation({ summary: "Community vote details" })
    @ApiParam({ name: "id", description: "MongoDB ObjectId of the vote" })
    @ApiResponse({ status: 200, type: CommunityVoteDto })
    @ApiResponse({ status: 404, description: "Vote not found" })
    findOne(@Param("id") id: string) {
        return this.communityVotesService.findOne(id);
    }

    @Post(":id/cast")
    @ApiOperation({
        summary: "Cast a vote",
        description:
            "The body must contain `choices` (array of option ids) and optionally `weights` for WEIGHTED.",
    })
    @ApiParam({ name: "id", description: "MongoDB ObjectId of the vote" })
    @ApiResponse({
        status: 201,
        type: CommunityVoteDto,
        description: "Vote recorded",
    })
    @ApiResponse({
        status: 400,
        description: "Vote closed, invalid choice, or quorum already reached",
    })
    @ApiResponse({ status: 409, description: "User has already voted" })
    cast(
        @Param("id") id: string,
        @Body() dto: CastVoteDto,
        @Request() req: AuthRequest,
    ) {
        return this.communityVotesService.cast(id, dto, req.user.sub);
    }

    @Get(":id/results")
    @ApiOperation({ summary: "Aggregated vote results" })
    @ApiParam({ name: "id", description: "MongoDB ObjectId of the vote" })
    @ApiResponse({ status: 200, type: CommunityVoteResultsDto })
    getResults(@Param("id") id: string) {
        return this.communityVotesService.getResults(id);
    }

    @Post(":id/close")
    @ApiOperation({
        summary: "Close a vote (creator or admin)",
        description:
            "Sets the status to 'closed'. Only the creator or an admin can close it.",
    })
    @ApiParam({ name: "id", description: "MongoDB ObjectId of the vote" })
    @ApiResponse({
        status: 201,
        type: CommunityVoteDto,
        description: "Vote closed",
    })
    @ApiResponse({
        status: 403,
        description: "Not authorized (creator or admin only)",
    })
    close(@Param("id") id: string, @Request() req: AuthRequest) {
        return this.communityVotesService.close(
            id,
            req.user.sub,
            req.user.role,
        );
    }
}
