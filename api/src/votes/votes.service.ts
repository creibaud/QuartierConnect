import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CastVoteDto } from "./dto/cast-vote.dto";
import { Vote, VoteDocument, VoteTargetType } from "./schemas/vote.schema";
import { getVoteStrategy } from "./strategies/vote-strategy.factory";

@Injectable()
export class VotesService {
    constructor(
        @InjectModel(Vote.name)
        private readonly voteModel: Model<VoteDocument>,
    ) {}

    async cast(dto: CastVoteDto, userId: string) {
        const strategy = getVoteStrategy(dto.targetType);
        if (!strategy.allowedTypes().includes(dto.voteType)) {
            throw new BadRequestException(
                `VoteType ${dto.voteType} not allowed for ${dto.targetType}. ` +
                    `Allowed: ${strategy.allowedTypes().join(", ")}`,
            );
        }

        const existing = await this.voteModel
            .findOne({
                userId,
                targetId: dto.targetId,
                targetType: dto.targetType,
            })
            .exec();

        if (existing) {
            if (existing.voteType === dto.voteType) {
                await existing.deleteOne();
                return { action: "removed", voteType: dto.voteType };
            }
            existing.set("voteType", dto.voteType);
            await existing.save();
            return { action: "changed", voteType: dto.voteType };
        }

        await this.voteModel.create({
            userId,
            targetId: dto.targetId,
            targetType: dto.targetType,
            voteType: dto.voteType,
        });
        return { action: "added", voteType: dto.voteType };
    }

    async getScore(targetId: string, targetType: VoteTargetType) {
        const votes = await this.voteModel
            .find({ targetId, targetType })
            .select("voteType")
            .lean()
            .exec();

        const strategy = getVoteStrategy(targetType);
        return strategy.calculate(votes);
    }
}
