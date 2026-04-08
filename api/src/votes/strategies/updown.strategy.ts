import { VoteResult, VoteStrategy } from "./vote.strategy";

export class UpDownStrategy implements VoteStrategy {
    allowedTypes() {
        return ["up", "down"];
    }

    calculate(votes: Array<{ voteType: string }>): VoteResult {
        const breakdown = { up: 0, down: 0 };
        for (const v of votes) {
            if (v.voteType === "up") breakdown.up++;
            else if (v.voteType === "down") breakdown.down++;
        }
        return { score: breakdown.up - breakdown.down, breakdown };
    }
}
