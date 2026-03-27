import { Injectable } from "@nestjs/common";
import type { VoteType } from "src/database/mongodb/models/vote.model";
import { BinaryStrategy } from "src/modules/votes/strategies/binary.strategy";
import { MultiChoiceStrategy } from "src/modules/votes/strategies/multi-choice.strategy";
import { SingleChoiceStrategy } from "src/modules/votes/strategies/single-choice.strategy";
import type { VoteStrategy } from "src/modules/votes/strategies/vote-strategy.interface";
import { WeightedStrategy } from "src/modules/votes/strategies/weighted.strategy";

@Injectable()
export class VoteStrategyFactory {
    constructor(
        private readonly binaryStrategy: BinaryStrategy,
        private readonly singleChoiceStrategy: SingleChoiceStrategy,
        private readonly multiChoiceStrategy: MultiChoiceStrategy,
        private readonly weightedStrategy: WeightedStrategy,
    ) {}

    getStrategy(type: VoteType): VoteStrategy {
        const strategies: Record<VoteType, VoteStrategy> = {
            binary: this.binaryStrategy,
            single_choice: this.singleChoiceStrategy,
            multi_choice: this.multiChoiceStrategy,
            weighted: this.weightedStrategy,
        };

        return strategies[type];
    }
}
