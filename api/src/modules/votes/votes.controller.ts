import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { User } from "src/database/drizzle/schema";
import { CreateVoteDto } from "src/modules/votes/dto/create-vote.dto";
import { RespondVoteDto } from "src/modules/votes/dto/respond-vote.dto";
import { VoteQueryDto } from "src/modules/votes/dto/vote-query.dto";
import { VotesService } from "src/modules/votes/votes.service";

const VOTE_EXAMPLE = {
    id: "507f1f77bcf86cd799439011",
    title: "Nouvelle fontaine ?",
    type: "binary",
    creatorId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
    quartierId: "a3bb189e-8bf9-3888-9912-ace4e6543002",
    options: [
        { id: "mock-uuid-1", label: "yes", votesCount: 0 },
        { id: "mock-uuid-2", label: "no", votesCount: 0 },
    ],
    startedAt: "2026-03-27T10:00:00.000Z",
    endsAt: "2026-04-03T10:00:00.000Z",
};

const NOT_FOUND = {
    statusCode: 404,
    message: "Vote not found",
    error: "Not Found",
};

const FORBIDDEN = {
    statusCode: 403,
    message: "Forbidden resource",
    error: "Forbidden",
};

@ApiTags("Votes")
@Controller("votes")
@ApiBearerAuth("access-token")
export class VotesController {
    constructor(private readonly votesService: VotesService) {}

    @Post()
    @ApiOperation({ summary: "Create a new vote" })
    @ApiResponse({
        status: 201,
        description: "Vote created",
        schema: { example: VOTE_EXAMPLE },
    })
    @ApiResponse({
        status: 400,
        description: "Validation error",
        schema: {
            example: {
                statusCode: 400,
                message: "Validation failed",
                error: "Bad Request",
            },
        },
    })
    create(@CurrentUser() user: User, @Body() dto: CreateVoteDto) {
        return this.votesService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: "List votes for a quartier" })
    @ApiResponse({
        status: 200,
        description: "Paginated vote list",
        schema: {
            example: {
                data: [VOTE_EXAMPLE],
                meta: { total: 3, page: 1, limit: 10, totalPages: 1 },
            },
        },
    })
    findAll(@Query() query: VoteQueryDto) {
        return this.votesService.findAll(query.quartierId ?? "", query);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a vote by ID" })
    @ApiResponse({
        status: 200,
        description: "Vote found",
        schema: { example: VOTE_EXAMPLE },
    })
    @ApiResponse({
        status: 404,
        description: "Vote not found",
        schema: { example: NOT_FOUND },
    })
    findOne(@Param("id") id: string) {
        return this.votesService.findOne(id);
    }

    @Post(":id/respond")
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: "Submit a response to a vote" })
    @ApiResponse({
        status: 201,
        description: "Response recorded",
        schema: {
            example: {
                voteId: "507f1f77bcf86cd799439011",
                userId: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
                optionId: "mock-uuid-1",
                respondedAt: "2026-03-27T10:00:00.000Z",
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: "Vote ended or invalid response",
        schema: {
            example: {
                statusCode: 400,
                message: "Vote has ended",
                error: "Bad Request",
            },
        },
    })
    @ApiResponse({
        status: 409,
        description: "Already responded",
        schema: {
            example: {
                statusCode: 409,
                message: "Already responded to this vote",
                error: "Conflict",
            },
        },
    })
    respond(
        @Param("id") id: string,
        @CurrentUser() user: User,
        @Body() dto: RespondVoteDto,
    ) {
        return this.votesService.respond(id, user.id, dto);
    }

    @Get(":id/results")
    @ApiOperation({ summary: "Get vote results" })
    @ApiResponse({
        status: 200,
        description: "Results returned",
        schema: {
            example: {
                voteId: "507f1f77bcf86cd799439011",
                type: "binary",
                results: { yes: 3, no: 1 },
                totalResponses: 4,
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Results hidden until vote ends",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Vote not found",
        schema: { example: NOT_FOUND },
    })
    getResults(@Param("id") id: string, @CurrentUser() user: User) {
        return this.votesService.getResults(id, user.id);
    }

    @Patch(":id/close")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Close a vote early (creator only)" })
    @ApiResponse({
        status: 200,
        description: "Vote closed",
        schema: {
            example: { ...VOTE_EXAMPLE, endsAt: "2026-03-27T10:00:00.000Z" },
        },
    })
    @ApiResponse({
        status: 403,
        description: "Not the creator",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Vote not found",
        schema: { example: NOT_FOUND },
    })
    close(@Param("id") id: string, @CurrentUser() user: User) {
        return this.votesService.close(id, user.id);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a vote (creator or admin)" })
    @ApiResponse({ status: 204, description: "Vote deleted" })
    @ApiResponse({
        status: 403,
        description: "Not creator or admin",
        schema: { example: FORBIDDEN },
    })
    @ApiResponse({
        status: 404,
        description: "Vote not found",
        schema: { example: NOT_FOUND },
    })
    delete(@Param("id") id: string, @CurrentUser() user: User) {
        return this.votesService.delete(id, user.id, user.role);
    }
}
