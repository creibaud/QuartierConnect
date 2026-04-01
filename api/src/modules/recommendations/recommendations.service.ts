import { Inject, Injectable, Logger } from "@nestjs/common";
import type { IRecommendationsRepository } from "./interfaces/recommendations-repository.interface";

@Injectable()
export class RecommendationsService {
    private readonly logger = new Logger(RecommendationsService.name);

    constructor(
        @Inject("IRecommendationsRepository")
        private readonly recommendationsRepository: IRecommendationsRepository,
    ) {}

    async getEventRecommendations(userId: string) {
        this.logger.log(`Event recommendations fetched for user ${userId}`);
        return this.recommendationsRepository.getEventRecommendations(userId);
    }

    async getServiceRecommendations(userId: string) {
        this.logger.log(`Service recommendations fetched for user ${userId}`);
        return this.recommendationsRepository.getServiceRecommendations(userId);
    }

    async getNeighborRecommendations(userId: string) {
        this.logger.log(`Neighbor recommendations fetched for user ${userId}`);
        return this.recommendationsRepository.getNeighborRecommendations(
            userId,
        );
    }
}
