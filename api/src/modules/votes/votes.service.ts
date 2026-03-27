import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import { buildPaginatedResult } from "src/common/query/query.helper";
import type {
    VoteDocument,
    VoteResponseDocument,
} from "src/database/mongodb/models/vote.model";
import {
    VOTE_RESPONSES_COLLECTION,
    VOTES_COLLECTION,
} from "src/database/mongodb/models/vote.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import type { CreateVoteDto } from "src/modules/votes/dto/create-vote.dto";
import type { RespondVoteDto } from "src/modules/votes/dto/respond-vote.dto";
import type { VoteQueryDto } from "src/modules/votes/dto/vote-query.dto";
import { VoteStrategyFactory } from "src/modules/votes/strategies/vote-strategy.factory";
import { v4 as uuid } from "uuid";

@Injectable()
export class VotesService {
    private readonly logger = new Logger(VotesService.name);

    constructor(
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        private readonly strategyFactory: VoteStrategyFactory,
    ) {}

    async create(creatorId: string, dto: CreateVoteDto) {
        const now = new Date();
        const endsAt = new Date(
            now.getTime() + dto.durationMinutes * 60 * 1000,
        );

        const options =
            dto.type === "binary"
                ? [
                      { id: uuid(), label: "yes", votesCount: 0 },
                      { id: uuid(), label: "no", votesCount: 0 },
                  ]
                : dto.options.map((opt) => ({
                      id: uuid(),
                      label: opt.label,
                      votesCount: 0,
                  }));

        const document: VoteDocument = {
            quartierId: dto.quartierId,
            creatorId,
            title: dto.title,
            description: dto.description,
            type: dto.type,
            options,
            durationMinutes: dto.durationMinutes,
            isAnonymous: dto.isAnonymous ?? false,
            quorumRequired: dto.quorumRequired,
            showResults: dto.showResults ?? true,
            restrictedToGroup: dto.restrictedToGroup,
            startedAt: now,
            endsAt,
            createdAt: now,
        };

        const result = await this.mongo
            .collection<VoteDocument>(VOTES_COLLECTION)
            .insertOne(document);

        const voteId = result.insertedId.toHexString();
        this.logger.log(`Vote created: ${voteId} by user ${creatorId}`);

        return { ...document, id: voteId };
    }

    async findAll(quartierId: string, query: VoteQueryDto) {
        const { page = 1, limit = 10 } = query;
        const filter: Record<string, unknown> = { quartierId };

        if (query.active !== undefined) {
            filter.endsAt = query.active
                ? { $gt: new Date() }
                : { $lte: new Date() };
        }

        const collection =
            this.mongo.collection<VoteDocument>(VOTES_COLLECTION);
        const skip = (page - 1) * limit;

        const [documents, total] = await Promise.all([
            collection
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(filter),
        ]);

        return buildPaginatedResult(
            documents.map(this.mapToResponse),
            total,
            page,
            limit,
        );
    }

    async findOne(id: string) {
        const document = await this.mongo
            .collection<VoteDocument>(VOTES_COLLECTION)
            .findOne({ _id: new ObjectId(id) });

        if (!document) {
            throw new NotFoundException("Vote not found");
        }

        return this.mapToResponse(document);
    }

    async respond(voteId: string, userId: string, dto: RespondVoteDto) {
        const vote = await this.findOne(voteId);

        if (new Date() > vote.endsAt) {
            throw new BadRequestException("This vote has already ended");
        }

        const existingResponse = await this.mongo
            .collection<VoteResponseDocument>(VOTE_RESPONSES_COLLECTION)
            .findOne({ voteId, userId });

        if (existingResponse) {
            throw new ConflictException(
                "You have already responded to this vote",
            );
        }

        const strategy = this.strategyFactory.getStrategy(vote.type);
        strategy.validateResponse(
            vote.options,
            dto.selectedOptions,
            dto.weightedValues,
        );

        const now = new Date();
        const response: Omit<VoteResponseDocument, "_id"> = {
            voteId,
            userId,
            selectedOptions: dto.selectedOptions,
            weightedValues: dto.weightedValues,
            respondedAt: now,
        };

        await this.mongo
            .collection<VoteResponseDocument>(VOTE_RESPONSES_COLLECTION)
            .insertOne({ ...response });

        await this.updateVoteOptionCounts(voteId, dto.selectedOptions);

        this.logger.log(`Vote response recorded: ${voteId} by user ${userId}`);

        return response;
    }

    async getResults(voteId: string, userId: string) {
        const vote = await this.findOne(voteId);

        if (!vote.showResults && new Date() < vote.endsAt) {
            throw new ForbiddenException(
                "Results are hidden until the vote ends",
            );
        }

        const responses = await this.mongo
            .collection<VoteResponseDocument>(VOTE_RESPONSES_COLLECTION)
            .find({ voteId })
            .toArray();

        const strategy = this.strategyFactory.getStrategy(vote.type);
        const results = strategy.calculateResults(responses);

        return {
            voteId,
            results,
            participationCount: responses.length,
            endsAt: vote.endsAt,
            isActive: new Date() < vote.endsAt,
        };
    }

    async close(voteId: string, userId: string) {
        const vote = await this.findOne(voteId);

        if (vote.creatorId !== userId) {
            throw new ForbiddenException(
                "Only the creator can close this vote",
            );
        }

        const now = new Date();
        await this.mongo
            .collection<VoteDocument>(VOTES_COLLECTION)
            .updateOne(
                { _id: new ObjectId(voteId) },
                { $set: { endsAt: now } },
            );

        this.logger.log(`Vote closed: ${voteId}`);

        return { ...vote, endsAt: now };
    }

    async delete(voteId: string, userId: string, userRole: string) {
        const vote = await this.findOne(voteId);

        if (vote.creatorId !== userId && userRole !== "admin") {
            throw new ForbiddenException(
                "Only the creator or an admin can delete this vote",
            );
        }

        await this.mongo
            .collection<VoteDocument>(VOTES_COLLECTION)
            .deleteOne({ _id: new ObjectId(voteId) });

        this.logger.log(`Vote deleted: ${voteId}`);
    }

    private async updateVoteOptionCounts(
        voteId: string,
        selectedOptionIds: string[],
    ) {
        const selectedSet = new Set(selectedOptionIds);

        await this.mongo.collection<VoteDocument>(VOTES_COLLECTION).updateOne(
            { _id: new ObjectId(voteId) },
            {
                $inc: Object.fromEntries(
                    [...selectedSet].map((optId) => [
                        `options.$[opt${optId}].votesCount`,
                        1,
                    ]),
                ),
            },
            {
                arrayFilters: [...selectedSet].map((optId) => ({
                    [`opt${optId}.id`]: optId,
                })),
            },
        );
    }

    private readonly mapToResponse = (
        document: VoteDocument & { _id?: ObjectId },
    ) => {
        const { _id, ...rest } = document;
        return { ...rest, id: _id?.toHexString() ?? "" };
    };
}
