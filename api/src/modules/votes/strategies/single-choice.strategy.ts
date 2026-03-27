import { BadRequestException, Injectable } from "@nestjs/common";
import type {
    VoteOption,
    VoteResponseDocument,
} from "src/database/mongodb/models/vote.model";
import type { VoteStrategy } from "src/modules/votes/strategies/vote-strategy.interface";

@Injectable()
export class SingleChoiceStrategy implements VoteStrategy {
    validateResponse(options: VoteOption[], selectedOptions: string[]): void {
        if (selectedOptions.length !== 1) {
            throw new BadRequestException(
                "Single choice vote requires exactly one selection",
            );
        }

        const validIds = options.map((opt) => opt.id);
        if (!validIds.includes(selectedOptions[0])) {
            throw new BadRequestException(
                "Selected option does not exist in this vote",
            );
        }
    }

    calculateResults(
        responses: VoteResponseDocument[],
    ): Record<string, number> {
        const results: Record<string, number> = {};

        for (const response of responses) {
            const choice = response.selectedOptions[0];
            results[choice] = (results[choice] ?? 0) + 1;
        }

        return results;
    }
}
