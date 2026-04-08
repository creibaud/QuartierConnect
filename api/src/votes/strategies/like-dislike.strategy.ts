import { VoteResult, VoteStrategy } from "./vote.strategy";

export class LikeDislikeStrategy implements VoteStrategy {
    allowedTypes() {
        return ["like", "dislike"];
    }

    calculate(votes: Array<{ voteType: string }>): VoteResult {
        const breakdown = { like: 0, dislike: 0 };
        for (const v of votes) {
            if (v.voteType === "like") breakdown.like++;
            else if (v.voteType === "dislike") breakdown.dislike++;
        }
        return { score: breakdown.like - breakdown.dislike, breakdown };
    }
}
