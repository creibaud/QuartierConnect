import { Controller, Get } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { User } from "src/database/drizzle/schema";
import { RecommendationsService } from "src/modules/recommendations/recommendations.service";

@ApiTags("Recommendations")
@Controller("recommendations")
@ApiBearerAuth("access-token")
export class RecommendationsController {
    constructor(
        private readonly recommendationsService: RecommendationsService,
    ) {}

    @Get("events")
    @ApiOperation({
        summary: "Get personalized event recommendations for the current user",
    })
    @ApiResponse({
        status: 200,
        description: "List of recommended event IDs with scores",
        schema: {
            example: {
                data: [
                    {
                        id: "507f1f77bcf86cd799439011",
                        title: "Barbecue de printemps",
                        score: 3,
                    },
                    {
                        id: "507f1f77bcf86cd799439012",
                        title: "Atelier jardinage",
                        score: 2,
                    },
                ],
            },
        },
    })
    getEventRecommendations(@CurrentUser() user: User) {
        return this.recommendationsService.getEventRecommendations(user.id);
    }

    @Get("services")
    @ApiOperation({
        summary:
            "Get personalized service recommendations for the current user",
    })
    @ApiResponse({
        status: 200,
        description: "List of recommended service IDs with scores",
        schema: {
            example: {
                data: [
                    {
                        id: "507f1f77bcf86cd799439013",
                        title: "Cours de jardinage",
                        score: 2,
                    },
                    {
                        id: "507f1f77bcf86cd799439014",
                        title: "Livraison de courses",
                        score: 1,
                    },
                ],
            },
        },
    })
    getServiceRecommendations(@CurrentUser() user: User) {
        return this.recommendationsService.getServiceRecommendations(user.id);
    }

    @Get("neighbors")
    @ApiOperation({
        summary: "Get neighbor recommendations based on social graph",
    })
    @ApiResponse({
        status: 200,
        description: "List of recommended neighbors with weights",
        schema: {
            example: {
                data: [
                    {
                        id: "7ace8b71-3d2a-5e5b-0d23-55e5735f9g92",
                        firstName: "Marie",
                        score: 5,
                    },
                    {
                        id: "8bdf9c82-4e3b-6f6c-1e34-66f6846g0h03",
                        firstName: "Paul",
                        score: 3,
                    },
                ],
            },
        },
    })
    getNeighborRecommendations(@CurrentUser() user: User) {
        return this.recommendationsService.getNeighborRecommendations(user.id);
    }
}
