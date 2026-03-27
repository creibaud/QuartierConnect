import { BadRequestException, Injectable } from "@nestjs/common";
import type {
    VoteOption,
    VoteResponseDocument,
} from "src/database/mongodb/models/vote.model";
import type { VoteStrategy } from "src/modules/votes/strategies/vote-strategy.interface";

@Injectable()
export class WeightedStrategy implements VoteStrategy {
    validateResponse(
        options: VoteOption[],
        _selectedOptions: string[],
        weightedValues?: Record<string, number>,
    ): void {
        if (!weightedValues || Object.keys(weightedValues).length === 0) {
            throw new BadRequestException(
                "Weighted vote requires weightedValues to be provided",
            );
        }

        const validIds = new Set(options.map((opt) => opt.id));
        for (const key of Object.keys(weightedValues)) {
            if (!validIds.has(key)) {
                throw new BadRequestException(
                    `Option '${key}' does not exist in this vote`,
                );
            }
        }

        const total = Object.values(weightedValues).reduce(
            (sum, val) => sum + val,
            0,
        );

        if (total > 100) {
            throw new BadRequestException(
                "Sum of weighted values must not exceed 100",
            );
        }
    }

    calculateResults(
        responses: VoteResponseDocument[],
    ): Record<string, number> {
        const results: Record<string, number> = {};

        for (const response of responses) {
            if (!response.weightedValues) continue;

            for (const [optionId, value] of Object.entries(
                response.weightedValues,
            )) {
                results[optionId] = (results[optionId] ?? 0) + value;
            }
        }

        return results;
    }
}
