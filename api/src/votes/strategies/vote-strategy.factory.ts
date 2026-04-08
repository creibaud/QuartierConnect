import { BadRequestException } from "@nestjs/common";
import { VoteTargetType } from "../schemas/vote.schema";
import { LikeDislikeStrategy } from "./like-dislike.strategy";
import { UpDownStrategy } from "./updown.strategy";
import { VoteStrategy } from "./vote.strategy";

const STRATEGIES: Record<VoteTargetType, VoteStrategy> = {
    [VoteTargetType.SERVICE]: new LikeDislikeStrategy(),
    [VoteTargetType.EVENT]: new LikeDislikeStrategy(),
    [VoteTargetType.INCIDENT]: new UpDownStrategy(),
    [VoteTargetType.COMMENT]: new UpDownStrategy(),
};

export function getVoteStrategy(targetType: VoteTargetType): VoteStrategy {
    const strategy = STRATEGIES[targetType];
    if (!strategy)
        throw new BadRequestException(`Unknown target type: ${targetType}`);
    return strategy;
}
