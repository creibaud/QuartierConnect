import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { escapeRegex, resolveSort } from "../common/pagination";
import { CastCommunityVoteDto } from "./dto/cast-community-vote.dto";
import { CreateCommunityVoteDto } from "./dto/create-community-vote.dto";
import {
    CommunityVote,
    CommunityVoteDocument,
    CommunityVoteType,
} from "./schemas/community-vote.schema";

// A weighted ballot distributes at most this total across the options.
export const MAX_WEIGHT_BUDGET = 10;

@Injectable()
export class CommunityVotesService {
    constructor(
        @InjectModel(CommunityVote.name)
        private readonly voteModel: Model<CommunityVoteDocument>,
    ) {}

    create(
        dto: CreateCommunityVoteDto,
        userId: string,
    ): Promise<CommunityVoteDocument> {
        return this.voteModel.create({
            ...dto,
            endsAt: new Date(dto.endsAt),
            createdBy: userId,
            casts: [],
            status: "open",
        });
    }

    // Anonymous votes expose only the requester's own cast; the participant
    // count stays truthful so list views agree with getResults.
    private sanitize(vote: CommunityVoteDocument, requesterId: string) {
        const plain = vote.toObject<CommunityVote & { _id: unknown }>();
        const participantCount = plain.casts.length;
        if (plain.isAnonymous) {
            plain.casts = plain.casts.filter((c) => c.userId === requesterId);
        }
        return { ...plain, participantCount };
    }

    async findAllFor(
        requesterId: string,
        page = 1,
        limit = 20,
        search?: string,
        status?: string,
        sort?: string,
        order?: string,
    ): Promise<{
        rows: (CommunityVote & { participantCount: number })[];
        total: number;
    }> {
        const skip = (page - 1) * limit;
        const filter: Record<string, unknown> = {};
        if (search?.trim()) {
            filter.title = new RegExp(escapeRegex(search.trim()), "i");
        }
        // A vote is open only while its status says so AND its deadline holds;
        // it is closed once manually closed OR its deadline has passed.
        const now = new Date();
        if (status === "open") {
            filter.status = "open";
            filter.endsAt = { $gt: now };
        }
        if (status === "closed") {
            filter.$or = [{ status: "closed" }, { endsAt: { $lte: now } }];
        }
        const { field, direction } = resolveSort(
            sort,
            order,
            ["createdAt", "endsAt"] as const,
            "createdAt",
        );
        const sortSpec: Record<string, 1 | -1> = {
            [field]: direction === "asc" ? 1 : -1,
        };
        // Keep .exec() (not .lean()): sanitize() relies on Mongoose documents.
        const [votes, total] = await Promise.all([
            this.voteModel
                .find(filter)
                .sort(sortSpec)
                .skip(skip)
                .limit(limit)
                .exec(),
            this.voteModel.countDocuments(filter),
        ]);
        return {
            rows: votes.map((vote) => this.sanitize(vote, requesterId)),
            total,
        };
    }

    async findOne(id: string): Promise<CommunityVoteDocument> {
        const vote = await this.voteModel.findById(id).exec();
        if (!vote) throw new NotFoundException("Vote not found");
        return vote;
    }

    async findOneFor(id: string, requesterId: string) {
        return this.sanitize(await this.findOne(id), requesterId);
    }

    async cast(id: string, dto: CastCommunityVoteDto, userId: string) {
        const vote = await this.findOne(id);

        if (vote.status === "closed" || new Date() > vote.endsAt) {
            throw new BadRequestException("This vote has ended");
        }

        const alreadyVoted = vote.casts.some((c) => c.userId === userId);
        if (alreadyVoted) {
            throw new ConflictException("You have already voted");
        }

        // Collapse repeated choices so one voter can't inflate a tally by
        // listing the same option several times.
        const choices = [...new Set(dto.choices)];
        dto = { ...dto, choices };

        this.validateChoices(vote.voteType, dto);

        const invalidChoices = dto.choices.filter(
            (c) => !vote.options.some((o) => o.id === c),
        );
        if (invalidChoices.length > 0) {
            throw new BadRequestException(
                `Invalid options: ${invalidChoices.join(", ")}`,
            );
        }

        // Weight keys feed getResults() totals, so reject unknown keys too.
        const invalidWeightKeys = Object.keys(dto.weights ?? {}).filter(
            (key) => !vote.options.some((o) => o.id === key),
        );
        if (invalidWeightKeys.length > 0) {
            throw new BadRequestException(
                `Invalid options: ${invalidWeightKeys.join(", ")}`,
            );
        }
        if (vote.voteType === CommunityVoteType.WEIGHTED && dto.weights) {
            this.assertWeightsWithinBudget(dto.weights);
        }

        // Atomic push: the filter re-checks the open/deadline/duplicate guards.
        const updated = await this.voteModel
            .findOneAndUpdate(
                {
                    _id: id,
                    status: "open",
                    endsAt: { $gt: new Date() },
                    "casts.userId": { $ne: userId },
                },
                {
                    $push: {
                        casts: {
                            userId,
                            choices: dto.choices,
                            weights: dto.weights,
                            castAt: new Date(),
                        },
                    },
                },
                { new: true },
            )
            .exec();
        if (!updated) {
            const current = await this.voteModel.findById(id).exec();
            if (!current) throw new NotFoundException("Vote not found");
            if (current.casts.some((c) => c.userId === userId)) {
                throw new ConflictException("You have already voted");
            }
            throw new BadRequestException("This vote has ended");
        }
        return this.sanitize(updated, userId);
    }

    async getResults(id: string): Promise<Record<string, unknown>> {
        const vote = await this.findOne(id);

        if (vote.status === "open" && new Date() > vote.endsAt) {
            vote.status = "closed";
            // Guarded write so the lazy auto-close never clobbers a concurrent update.
            await this.voteModel
                .updateOne(
                    { _id: id, status: "open" },
                    { $set: { status: "closed" } },
                )
                .exec();
        }
        const totals: Record<string, number> = {};

        for (const option of vote.options) {
            totals[option.id] = 0;
        }

        for (const cast of vote.casts) {
            if (vote.voteType === CommunityVoteType.WEIGHTED && cast.weights) {
                // weights is declared `Map` in the schema, so on a hydrated
                // document Object.entries() yields Mongoose internals instead
                // of the weights. Only declared options are counted, so no
                // internal key can reach the response either way.
                const weights =
                    cast.weights instanceof Map
                        ? [...cast.weights.entries()]
                        : Object.entries(cast.weights);
                for (const [optionId, weight] of weights) {
                    if (!(optionId in totals)) continue;
                    const value = Number(weight);
                    if (!Number.isFinite(value)) continue;
                    totals[optionId] += value;
                }
            } else {
                for (const choice of cast.choices) {
                    totals[choice] = (totals[choice] ?? 0) + 1;
                }
            }
        }

        // quorum is an absolute minimum participant count (0 = no quorum).
        const quorumReached =
            vote.quorum === 0 || vote.casts.length >= vote.quorum;

        return {
            voteId: id,
            totals,
            totalParticipants: vote.casts.length,
            quorumReached,
            status: vote.status,
            endsAt: vote.endsAt,
            options: vote.options,
            isAnonymous: vote.isAnonymous,
        };
    }

    async close(id: string, requesterId: string, requesterRole: string) {
        const vote = await this.findOne(id);
        if (vote.createdBy !== requesterId && requesterRole !== "admin") {
            throw new ForbiddenException(
                "Only the creator or an admin can close this vote",
            );
        }
        vote.status = "closed";
        return this.sanitize(await vote.save(), requesterId);
    }

    private validateChoices(
        voteType: CommunityVoteType,
        dto: CastCommunityVoteDto,
    ): void {
        if (
            (voteType === CommunityVoteType.BINARY ||
                voteType === CommunityVoteType.SINGLE_CHOICE) &&
            dto.choices.length !== 1
        ) {
            throw new BadRequestException(
                "This vote type requires exactly 1 choice",
            );
        }

        if (voteType === CommunityVoteType.WEIGHTED && !dto.weights) {
            throw new BadRequestException("Weighted vote requires weights");
        }
    }

    // Each ballot spends at most a fixed budget across options, so no single
    // voter can dominate with a huge or negative weight.
    private assertWeightsWithinBudget(weights: Record<string, number>): void {
        let sum = 0;
        for (const value of Object.values(weights)) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric) || numeric < 0) {
                throw new BadRequestException(
                    "Weights must be finite, non-negative numbers",
                );
            }
            sum += numeric;
        }
        if (sum <= 0 || sum > MAX_WEIGHT_BUDGET) {
            throw new BadRequestException(
                `Weights must sum to a value in (0, ${MAX_WEIGHT_BUDGET}]`,
            );
        }
    }
}
