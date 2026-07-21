import { VoteResult, VoteStrategy } from "./vote.strategy";

export class UpDownStrategy implements VoteStrategy {
    allowedTypes() {
        return ["up", "down"];
    }

    calculate(counts: Record<string, number>): VoteResult {
        const breakdown = { up: counts.up ?? 0, down: counts.down ?? 0 };
        return { score: breakdown.up - breakdown.down, breakdown };
    }
}
