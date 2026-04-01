import { Module } from "@nestjs/common";
import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";
import {
    RecommendationsRepository,
    type IRecommendationsRepository,
} from "src/modules/recommendations/recommendation.repository";
import { RecommendationsController } from "src/modules/recommendations/recommendations.controller";
import { RecommendationsService } from "src/modules/recommendations/recommendations.service";

@Module({
    controllers: [RecommendationsController],
    providers: [
        {
            provide: "IRecommendationsRepository",
            useFactory: (driver: Neo4jDriver) =>
                new RecommendationsRepository(driver),
            inject: ["NEO4J"],
        },
        RecommendationsService,
    ],
    exports: [RecommendationsService],
})
export class RecommendationsModule {}
