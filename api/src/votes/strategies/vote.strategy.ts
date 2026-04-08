export interface VoteResult {
    score: number;
    breakdown: Record<string, number>;
}

export interface VoteStrategy {
    calculate(votes: Array<{ voteType: string }>): VoteResult;
    allowedTypes(): string[];
}
