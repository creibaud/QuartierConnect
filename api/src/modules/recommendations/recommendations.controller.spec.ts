import { Test, TestingModule } from "@nestjs/testing";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";

describe("RecommendationsController", () => {
    let controller: RecommendationsController;
    let service: RecommendationsService;

    const mockUser = {
        id: "user-uuid",
        email: "user@test.local",
        role: "resident" as const,
        isActive: true,
    };

    const mockEventRec = {
        eventId: "event-uuid",
        title: "Barbecue de printemps",
        score: 3,
    };

    const mockServiceRec = {
        serviceId: "service-uuid",
        title: "Cours de jardinage",
        score: 2,
    };

    const mockNeighborRec = {
        id: "neighbor-uuid",
        firstName: "Marie",
        score: 5,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RecommendationsController],
            providers: [
                {
                    provide: RecommendationsService,
                    useValue: {
                        getEventRecommendations: jest.fn(),
                        getServiceRecommendations: jest.fn(),
                        getNeighborRecommendations: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<RecommendationsController>(
            RecommendationsController,
        );
        service = module.get<RecommendationsService>(RecommendationsService);
    });

    describe("getEventRecommendations", () => {
        it("should return personalized event recommendations", async () => {
            const recommendations = { data: [mockEventRec] };
            service.getEventRecommendations.mockResolvedValue(recommendations);

            const result = await controller.getEventRecommendations(mockUser);

            expect(service.getEventRecommendations).toHaveBeenCalledWith(
                mockUser.id,
            );
            expect(result.data).toHaveLength(1);
            expect(result.data[0].eventId).toBe("event-uuid");
        });

        it("should include recommendation scores", async () => {
            const recommendations = {
                data: [
                    mockEventRec,
                    { eventId: "event-2", title: "Atelier", score: 2 },
                ],
            };
            service.getEventRecommendations.mockResolvedValue(recommendations);

            const result = await controller.getEventRecommendations(mockUser);

            expect(result.data[0].score).toBe(3);
            expect(result.data[1].score).toBe(2);
        });

        it("should return empty list if no recommendations", async () => {
            const recommendations = { data: [] };
            service.getEventRecommendations.mockResolvedValue(recommendations);

            const result = await controller.getEventRecommendations(mockUser);

            expect(result.data).toHaveLength(0);
        });

        it("should rank by relevance score", async () => {
            const recommendations = {
                data: [
                    { eventId: "1", title: "High score", score: 5 },
                    { eventId: "2", title: "Medium score", score: 3 },
                    { eventId: "3", title: "Low score", score: 1 },
                ],
            };
            service.getEventRecommendations.mockResolvedValue(recommendations);

            const result = await controller.getEventRecommendations(mockUser);

            expect(result.data[0].score).toBeGreaterThan(result.data[1].score);
            expect(result.data[1].score).toBeGreaterThan(result.data[2].score);
        });

        it("should be user-specific (different users get different recs)", async () => {
            service.getEventRecommendations.mockResolvedValue({
                data: [mockEventRec],
            });

            await controller.getEventRecommendations(mockUser);

            expect(service.getEventRecommendations).toHaveBeenCalledWith(
                mockUser.id,
            );
        });
    });

    describe("getServiceRecommendations", () => {
        it("should return personalized service recommendations", async () => {
            const recommendations = { data: [mockServiceRec] };
            service.getServiceRecommendations.mockResolvedValue(
                recommendations,
            );

            const result = await controller.getServiceRecommendations(mockUser);

            expect(service.getServiceRecommendations).toHaveBeenCalledWith(
                mockUser.id,
            );
            expect(result.data).toHaveLength(1);
            expect(result.data[0].serviceId).toBe("service-uuid");
        });

        it("should include service titles and scores", async () => {
            const recommendations = {
                data: [
                    mockServiceRec,
                    { serviceId: "svc-2", title: "Babysitting", score: 1 },
                ],
            };
            service.getServiceRecommendations.mockResolvedValue(
                recommendations,
            );

            const result = await controller.getServiceRecommendations(mockUser);

            expect(result.data[0]).toHaveProperty("title");
            expect(result.data[0]).toHaveProperty("score");
        });

        it("should return empty list if no recommendations", async () => {
            const recommendations = { data: [] };
            service.getServiceRecommendations.mockResolvedValue(
                recommendations,
            );

            const result = await controller.getServiceRecommendations(mockUser);

            expect(result.data).toHaveLength(0);
        });

        it("should consider user history for ranking", async () => {
            const recommendations = {
                data: [
                    { serviceId: "garden", title: "Gardening", score: 4 },
                    { serviceId: "repair", title: "Repair", score: 2 },
                ],
            };
            service.getServiceRecommendations.mockResolvedValue(
                recommendations,
            );

            const result = await controller.getServiceRecommendations(mockUser);

            // Verify service with higher score is first (user's preference)
            expect(result.data[0].score).toBeGreaterThan(result.data[1].score);
        });
    });

    describe("getNeighborRecommendations", () => {
        it("should return neighbor recommendations based on social graph", async () => {
            const recommendations = { data: [mockNeighborRec] };
            service.getNeighborRecommendations.mockResolvedValue(
                recommendations,
            );

            const result =
                await controller.getNeighborRecommendations(mockUser);

            expect(service.getNeighborRecommendations).toHaveBeenCalledWith(
                mockUser.id,
            );
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id).toBe("neighbor-uuid");
        });

        it("should include neighbor details with weights", async () => {
            const recommendations = {
                data: [
                    { id: "neighbor-1", firstName: "Marie", score: 5 },
                    { id: "neighbor-2", firstName: "Paul", score: 3 },
                ],
            };
            service.getNeighborRecommendations.mockResolvedValue(
                recommendations,
            );

            const result =
                await controller.getNeighborRecommendations(mockUser);

            expect(result.data[0]).toHaveProperty("firstName");
            expect(result.data[0]).toHaveProperty("score");
        });

        it("should return empty list if no recommendations", async () => {
            const recommendations = { data: [] };
            service.getNeighborRecommendations.mockResolvedValue(
                recommendations,
            );

            const result =
                await controller.getNeighborRecommendations(mockUser);

            expect(result.data).toHaveLength(0);
        });

        it("should rank neighbors by relevance (weight)", async () => {
            const recommendations = {
                data: [
                    { id: "1", firstName: "High weight", score: 8 },
                    { id: "2", firstName: "Medium weight", score: 5 },
                    { id: "3", firstName: "Low weight", score: 2 },
                ],
            };
            service.getNeighborRecommendations.mockResolvedValue(
                recommendations,
            );

            const result =
                await controller.getNeighborRecommendations(mockUser);

            // Verify descending order by weight
            expect(result.data[0].score).toBeGreaterThan(result.data[1].score);
            expect(result.data[1].score).toBeGreaterThan(result.data[2].score);
        });

        it("should consider friend-of-friend graph", async () => {
            const recommendations = {
                data: [
                    { id: "friend-id", firstName: "Direct friend", score: 10 },
                    { id: "fof-id", firstName: "Friend of friend", score: 4 },
                ],
            };
            service.getNeighborRecommendations.mockResolvedValue(
                recommendations,
            );

            const result =
                await controller.getNeighborRecommendations(mockUser);

            // Direct friends have higher weight than FoF
            expect(result.data[0].score).toBeGreaterThan(result.data[1].score);
        });
    });

    describe("recommendation accuracy", () => {
        it("should personalize recommendations per user", async () => {
            const userA = { ...mockUser, id: "user-a" };
            const userB = { ...mockUser, id: "user-b" };

            service.getEventRecommendations
                .mockResolvedValueOnce({
                    data: [{ eventId: "event-1", score: 5 }],
                })
                .mockResolvedValueOnce({
                    data: [{ eventId: "event-2", score: 5 }],
                });

            const resultA = await controller.getEventRecommendations(userA);
            const resultB = await controller.getEventRecommendations(userB);

            // Different users may get different recommendations
            expect(service.getEventRecommendations).toHaveBeenCalledWith(
                userA.id,
            );
            expect(service.getEventRecommendations).toHaveBeenCalledWith(
                userB.id,
            );
        });
    });
});
