export interface VoteResult {
    score: number;
    breakdown: Record<string, number>;
}

export interface VoteStrategy {
    calculate(counts: Record<string, number>): VoteResult;
    allowedTypes(): string[];
}
