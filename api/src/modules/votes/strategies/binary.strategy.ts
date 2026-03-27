import { BadRequestException, Injectable } from "@nestjs/common";
import type {
    VoteOption,
    VoteResponseDocument,
} from "src/database/mongodb/models/vote.model";
import type { VoteStrategy } from "src/modules/votes/strategies/vote-strategy.interface";

@Injectable()
export class BinaryStrategy implements VoteStrategy {
    validateResponse(_options: VoteOption[], selectedOptions: string[]): void {
        if (selectedOptions.length !== 1) {
            throw new BadRequestException(
                "Binary vote requires exactly one selection",
            );
        }

        const choice = selectedOptions[0];
        if (choice !== "yes" && choice !== "no") {
            throw new BadRequestException(
                "Binary vote only accepts 'yes' or 'no'",
            );
        }
    }

    calculateResults(
        responses: VoteResponseDocument[],
    ): Record<string, number> {
        const results: Record<string, number> = { yes: 0, no: 0 };

        for (const response of responses) {
            const choice = response.selectedOptions[0];
            if (choice === "yes" || choice === "no") {
                results[choice]++;
            }
        }

        return results;
    }
}
