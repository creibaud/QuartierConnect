import { VoteResult, VoteStrategy } from "./vote.strategy";

export class LikeDislikeStrategy implements VoteStrategy {
    allowedTypes() {
        return ["like", "dislike"];
    }

    calculate(counts: Record<string, number>): VoteResult {
        const breakdown = {
            like: counts.like ?? 0,
            dislike: counts.dislike ?? 0,
        };
        return { score: breakdown.like - breakdown.dislike, breakdown };
    }
}
