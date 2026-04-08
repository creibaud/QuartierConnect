import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CastVoteDto } from "./dto/cast-vote.dto";
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

    findAll(page = 1, limit = 20): Promise<CommunityVoteDocument[]> {
        const skip = (page - 1) * limit;
        return this.voteModel
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async findOne(id: string): Promise<CommunityVoteDocument> {
        const vote = await this.voteModel.findById(id).exec();
        if (!vote) throw new NotFoundException("Vote not found");
        return vote;
    }

    async cast(
        id: string,
        dto: CastVoteDto,
        userId: string,
    ): Promise<CommunityVoteDocument> {
        const vote = await this.findOne(id);

        if (vote.status === "closed" || new Date() > vote.endsAt) {
            throw new BadRequestException("Ce vote est terminé");
        }

        const alreadyVoted = vote.casts.some((c) => c.userId === userId);
        if (alreadyVoted) {
            throw new ConflictException("Vous avez déjà voté");
        }

        this.validateChoices(vote.voteType, dto);

        const invalidChoices = dto.choices.filter(
            (c) => !vote.options.some((o) => o.id === c),
        );
        if (invalidChoices.length > 0) {
            throw new BadRequestException(
                `Options invalides: ${invalidChoices.join(", ")}`,
            );
        }

        vote.casts.push({
            userId,
            choices: dto.choices,
            weights: dto.weights,
            castAt: new Date(),
        });

        return vote.save();
    }

    async getResults(id: string): Promise<Record<string, unknown>> {
        const vote = await this.findOne(id);

        if (vote.status === "open" && new Date() > vote.endsAt) {
            vote.status = "closed";
            await vote.save();
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

    async close(
        id: string,
        requesterId: string,
        requesterRole: string,
    ): Promise<CommunityVoteDocument> {
        const vote = await this.findOne(id);
        if (vote.createdBy !== requesterId && requesterRole !== "admin") {
            throw new ForbiddenException(
                "Seul le créateur ou un admin peut fermer ce vote",
            );
        }
        vote.status = "closed";
        return vote.save();
    }

    private validateChoices(
        voteType: CommunityVoteType,
        dto: CastVoteDto,
    ): void {
        if (
            (voteType === CommunityVoteType.BINARY ||
                voteType === CommunityVoteType.SINGLE_CHOICE) &&
            dto.choices.length !== 1
        ) {
            throw new BadRequestException(
                "Ce type de vote requiert exactement 1 choix",
            );
        }

        if (voteType === CommunityVoteType.WEIGHTED && !dto.weights) {
            throw new BadRequestException("Le vote pondéré requiert des poids");
        }
    }
}
