import { BadRequestException, Injectable } from "@nestjs/common";
import type {
    VoteOption,
    VoteResponseDocument,
} from "src/database/mongodb/models/vote.model";
import type { VoteStrategy } from "src/modules/votes/strategies/vote-strategy.interface";

@Injectable()
export class MultiChoiceStrategy implements VoteStrategy {
    validateResponse(options: VoteOption[], selectedOptions: string[]): void {
        if (selectedOptions.length < 1) {
            throw new BadRequestException(
                "Multi choice vote requires at least one selection",
            );
        }

        const validIds = new Set(options.map((opt) => opt.id));
        for (const selected of selectedOptions) {
            if (!validIds.has(selected)) {
                throw new BadRequestException(
                    `Selected option '${selected}' does not exist in this vote`,
                );
            }
        }
    }

    calculateResults(
        responses: VoteResponseDocument[],
    ): Record<string, number> {
        const results: Record<string, number> = {};

        for (const response of responses) {
            for (const choice of response.selectedOptions) {
                results[choice] = (results[choice] ?? 0) + 1;
            }
        }

        return results;
    }
}
