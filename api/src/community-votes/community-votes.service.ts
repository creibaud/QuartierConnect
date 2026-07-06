import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CastCommunityVoteDto } from "./dto/cast-community-vote.dto";
import { CreateCommunityVoteDto } from "./dto/create-community-vote.dto";
import {
    CommunityVote,
    CommunityVoteDocument,
    CommunityVoteType,
} from "./schemas/community-vote.schema";

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

    // Anonymous votes must never expose who voted what: every response
    // keeps only the requester's own cast (the client derives "has voted"
    // and "my choices" from it); aggregated totals stay available through
    // getResults, which exposes no user ids.
    private sanitize(vote: CommunityVoteDocument, requesterId: string) {
        if (!vote.isAnonymous) return vote;
        const plain = vote.toObject<CommunityVote & { _id: unknown }>();
        plain.casts = plain.casts.filter((c) => c.userId === requesterId);
        return plain;
    }

    async findAllFor(requesterId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const votes = await this.voteModel
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
        return votes.map((vote) => this.sanitize(vote, requesterId));
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

        this.validateChoices(vote.voteType, dto);

        const invalidChoices = dto.choices.filter(
            (c) => !vote.options.some((o) => o.id === c),
        );
        if (invalidChoices.length > 0) {
            throw new BadRequestException(
                `Invalid options: ${invalidChoices.join(", ")}`,
            );
        }

        // Weight keys feed getResults() totals directly, so an unknown key
        // must be rejected exactly like an unknown choice.
        const invalidWeightKeys = Object.keys(dto.weights ?? {}).filter(
            (key) => !vote.options.some((o) => o.id === key),
        );
        if (invalidWeightKeys.length > 0) {
            throw new BadRequestException(
                `Invalid options: ${invalidWeightKeys.join(", ")}`,
            );
        }

        // Atomic push: MongoDB re-checks the open/deadline/duplicate guards
        // itself, so two concurrent casts by the same user can never record
        // two ballots.
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
            // Guarded write (same pattern as the atomic cast): the lazy
            // auto-close must never clobber a concurrent update.
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
                for (const [optionId, weight] of Object.entries(cast.weights)) {
                    totals[optionId] = (totals[optionId] ?? 0) + weight;
                }
            } else {
                for (const choice of cast.choices) {
                    totals[choice] = (totals[choice] ?? 0) + 1;
                }
            }
        }

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
}
