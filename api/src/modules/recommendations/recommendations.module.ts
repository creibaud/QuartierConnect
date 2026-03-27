import { Module } from "@nestjs/common";
import { RecommendationsController } from "src/modules/recommendations/recommendations.controller";
import { RecommendationsService } from "src/modules/recommendations/recommendations.service";

@Module({
    controllers: [RecommendationsController],
    providers: [RecommendationsService],
    exports: [RecommendationsService],
})
export class RecommendationsModule {}
