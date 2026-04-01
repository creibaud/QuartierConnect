import { Test, TestingModule } from "@nestjs/testing";
import type { IRecommendationsRepository } from "src/modules/recommendations/interfaces/recommendations-repository.interface";
import { RecommendationsService } from "src/modules/recommendations/recommendations.service";

describe("RecommendationsService", () => {
    let service: RecommendationsService;
    let repositoryMock: jest.Mocked<IRecommendationsRepository>;

    beforeEach(async () => {
        repositoryMock = {
            getEventRecommendations: jest.fn().mockResolvedValue([]),
            getServiceRecommendations: jest.fn().mockResolvedValue([]),
            getNeighborRecommendations: jest.fn().mockResolvedValue([]),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RecommendationsService,
                {
                    provide: "IRecommendationsRepository",
                    useValue: repositoryMock,
                },
            ],
        }).compile();

        service = module.get<RecommendationsService>(RecommendationsService);
    });

    describe("getEventRecommendations", () => {
        it("delegates to repository.getEventRecommendations", async () => {
            const expectedResult = [
                { eventId: "event-1", title: "Event one", score: 5 },
                { eventId: "event-2", title: "Event two", score: 3 },
            ];
            repositoryMock.getEventRecommendations.mockResolvedValue(
                expectedResult as any,
            );

            const result = await service.getEventRecommendations("user-id");

            expect(repositoryMock.getEventRecommendations).toHaveBeenCalledWith(
                "user-id",
            );
            expect(result).toEqual(expectedResult);
        });

        it("returns an empty array when there are no recommendations", async () => {
            repositoryMock.getEventRecommendations.mockResolvedValue([]);

            const result = await service.getEventRecommendations("user-id");

            expect(result).toEqual([]);
        });
    });

    describe("getServiceRecommendations", () => {
        it("delegates to repository.getServiceRecommendations", async () => {
            const expectedResult = [
                { serviceId: "service-1", title: "Service one", score: 4 },
            ];
            repositoryMock.getServiceRecommendations.mockResolvedValue(
                expectedResult as any,
            );

            const result = await service.getServiceRecommendations("user-id");

            expect(
                repositoryMock.getServiceRecommendations,
            ).toHaveBeenCalledWith("user-id");
            expect(result).toEqual(expectedResult);
        });

        it("returns an empty array when there are no recommendations", async () => {
            repositoryMock.getServiceRecommendations.mockResolvedValue([]);

            const result = await service.getServiceRecommendations("user-id");

            expect(result).toEqual([]);
        });
    });

    describe("getNeighborRecommendations", () => {
        it("delegates to repository.getNeighborRecommendations", async () => {
            const expectedResult = [
                {
                    userId: "neighbor-1",
                    firstName: "Alice",
                    lastName: "Martin",
                    weight: 2.5,
                },
            ];
            repositoryMock.getNeighborRecommendations.mockResolvedValue(
                expectedResult as any,
            );

            const result = await service.getNeighborRecommendations("user-id");

            expect(
                repositoryMock.getNeighborRecommendations,
            ).toHaveBeenCalledWith("user-id");
            expect(result).toEqual(expectedResult);
        });

        it("returns an empty array when there are no neighbor suggestions", async () => {
            repositoryMock.getNeighborRecommendations.mockResolvedValue([]);

            const result = await service.getNeighborRecommendations("user-id");

            expect(result).toEqual([]);
        });

        it("propagates errors from repository", async () => {
            repositoryMock.getNeighborRecommendations.mockRejectedValue(
                new Error("Neo4j connection error"),
            );

            await expect(
                service.getNeighborRecommendations("user-id"),
            ).rejects.toThrow("Neo4j connection error");
        });
    });

    describe("error handling", () => {
        it("propagates errors from getEventRecommendations", async () => {
            repositoryMock.getEventRecommendations.mockRejectedValue(
                new Error("Database error"),
            );

            await expect(
                service.getEventRecommendations("user-id"),
            ).rejects.toThrow("Database error");
        });

        it("propagates errors from getServiceRecommendations", async () => {
            repositoryMock.getServiceRecommendations.mockRejectedValue(
                new Error("Query timeout"),
            );

            await expect(
                service.getServiceRecommendations("user-id"),
            ).rejects.toThrow("Query timeout");
        });

        it("propagates errors from getNeighborRecommendations", async () => {
            repositoryMock.getNeighborRecommendations.mockRejectedValue(
                new Error("Connection refused"),
            );

            await expect(
                service.getNeighborRecommendations("user-id"),
            ).rejects.toThrow("Connection refused");
        });
    });
});
