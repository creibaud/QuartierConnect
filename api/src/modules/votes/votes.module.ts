import { Module } from "@nestjs/common";
import { MongodbModule } from "src/database/mongodb/mongodb.module";
import { BinaryStrategy } from "src/modules/votes/strategies/binary.strategy";
import { MultiChoiceStrategy } from "src/modules/votes/strategies/multi-choice.strategy";
import { SingleChoiceStrategy } from "src/modules/votes/strategies/single-choice.strategy";
import { VoteStrategyFactory } from "src/modules/votes/strategies/vote-strategy.factory";
import { WeightedStrategy } from "src/modules/votes/strategies/weighted.strategy";
import { VotesController } from "src/modules/votes/votes.controller";
import { VotesService } from "src/modules/votes/votes.service";

@Module({
    imports: [MongodbModule],
    controllers: [VotesController],
    providers: [
        BinaryStrategy,
        SingleChoiceStrategy,
        MultiChoiceStrategy,
        WeightedStrategy,
        VoteStrategyFactory,
        VotesService,
    ],
    exports: [VotesService],
})
export class VotesModule {}
