import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { isValidObjectId, Model } from "mongoose";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { Event } from "../events/schemas/event.schema";
import { Service } from "../services/schemas/service.schema";
import { CastVoteDto } from "./dto/cast-vote.dto";
import { Vote, VoteDocument, VoteTargetType } from "./schemas/vote.schema";
import { getVoteStrategy } from "./strategies/vote-strategy.factory";

export interface VoteRequester {
    sub: string;
    role: string;
    neighborhoodId?: string | null;
}

@Injectable()
export class VotesService {
    constructor(
        @InjectModel(Vote.name)
        private readonly voteModel: Model<VoteDocument>,
        @InjectModel(Service.name)
        private readonly serviceModel: Model<Service>,
        @InjectModel(Event.name)
        private readonly eventModel: Model<Event>,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    async cast(dto: CastVoteDto, requester: VoteRequester) {
        const strategy = getVoteStrategy(dto.targetType);
        if (!strategy.allowedTypes().includes(dto.voteType)) {
            throw new BadRequestException(
                `VoteType ${dto.voteType} not allowed for ${dto.targetType}. ` +
                    `Allowed: ${strategy.allowedTypes().join(", ")}`,
            );
        }
        await this.assertTargetVotable(dto, requester);

        const userId = requester.sub;
        const existing = await this.voteModel
            .findOne({
                userId,
                targetId: String(dto.targetId),
                targetType: String(dto.targetType),
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

    // A vote must aim at something that exists and that the voter could read.
    private async assertTargetVotable(
        dto: CastVoteDto,
        requester: VoteRequester,
    ): Promise<void> {
        const targetNeighborhood = await this.findTargetNeighborhood(dto);
        if (requester.role === "admin") return;
        if (targetNeighborhood !== (requester.neighborhoodId ?? null)) {
            throw new ForbiddenException(
                "Vote target outside your neighborhood",
            );
        }
    }

    private async findTargetNeighborhood(
        dto: CastVoteDto,
    ): Promise<string | null> {
        switch (dto.targetType) {
            case VoteTargetType.INCIDENT: {
                const [incident] = await this.db
                    .select({
                        neighborhoodId: schema.incidents.neighborhoodId,
                    })
                    .from(schema.incidents)
                    .where(
                        and(
                            eq(schema.incidents.id, dto.targetId),
                            isNull(schema.incidents.deletedAt),
                        ),
                    )
                    .limit(1);
                if (!incident) {
                    throw new NotFoundException("Vote target not found");
                }
                return incident.neighborhoodId;
            }
            case VoteTargetType.SERVICE:
                return this.findMongoTargetNeighborhood(
                    this.serviceModel,
                    dto.targetId,
                );
            case VoteTargetType.EVENT:
                return this.findMongoTargetNeighborhood(
                    this.eventModel,
                    dto.targetId,
                );
            default:
                // No comment collection exists; refuse rather than store orphans.
                throw new BadRequestException(
                    `Votes on ${dto.targetType} targets are not supported`,
                );
        }
    }

    private async findMongoTargetNeighborhood(
        model: Model<Service> | Model<Event>,
        targetId: string,
    ): Promise<string | null> {
        if (!isValidObjectId(targetId)) {
            throw new NotFoundException("Vote target not found");
        }
        const target = await (model as Model<Service>)
            .findById(targetId)
            .select("neighborhoodId")
            .lean();
        if (!target) throw new NotFoundException("Vote target not found");
        return (
            (
                target as { neighborhoodId?: { toString(): string } | null }
            ).neighborhoodId?.toString() ?? null
        );
    }

    async getScore(targetId: string, targetType: VoteTargetType) {
        const votes = await this.voteModel
            .find({
                targetId: String(targetId),
                targetType: String(targetType),
            })
            .select("voteType")
            .lean()
            .exec();

        const strategy = getVoteStrategy(targetType);
        return strategy.calculate(votes);
    }
}
