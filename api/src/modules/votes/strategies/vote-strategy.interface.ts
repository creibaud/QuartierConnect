import type {
    VoteOption,
    VoteResponseDocument,
} from "src/database/mongodb/models/vote.model";

export interface VoteStrategy {
    validateResponse(
        options: VoteOption[],
        selectedOptions: string[],
        weightedValues?: Record<string, number>,
    ): void;

    calculateResults(responses: VoteResponseDocument[]): Record<string, number>;
}
