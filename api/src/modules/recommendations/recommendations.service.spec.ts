import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";
import { RecommendationsService } from "src/modules/recommendations/recommendations.service";

const buildRecord = (values: Record<string, unknown>) => ({
    get: jest.fn().mockImplementation((key: string) => {
        const value = values[key];
        if (typeof value === "number") {
            return { toNumber: () => value };
        }
        return value;
    }),
});

describe("RecommendationsService", () => {
    let service: RecommendationsService;
    let sessionRunMock: jest.Mock;
    let sessionCloseMock: jest.Mock;
    let neo4j: Neo4jDriver;

    beforeEach(() => {
        jest.clearAllMocks();

        sessionRunMock = jest.fn();
        sessionCloseMock = jest.fn().mockResolvedValue(undefined);

        neo4j = {
            session: jest.fn().mockReturnValue({
                run: sessionRunMock,
                close: sessionCloseMock,
            }),
        } as unknown as Neo4jDriver;

        service = new RecommendationsService(neo4j);
    });

    describe("getEventRecommendations", () => {
        it("runs the correct Cypher query and maps results", async () => {
            const records = [
                buildRecord({ eventId: "event-1", score: 5 }),
                buildRecord({ eventId: "event-2", score: 3 }),
            ];
            sessionRunMock.mockResolvedValue({ records });

            const result = await service.getEventRecommendations("user-id");

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("INTERESTED_IN_CATEGORY"),
                { userId: "user-id" },
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("PARTICIPATED_IN"),
                { userId: "user-id" },
            );

            expect(result).toEqual([
                { eventId: "event-1", score: 5 },
                { eventId: "event-2", score: 3 },
            ]);

            expect(sessionCloseMock).toHaveBeenCalled();
        });

        it("returns an empty array when there are no recommendations", async () => {
            sessionRunMock.mockResolvedValue({ records: [] });

            const result = await service.getEventRecommendations("user-id");

            expect(result).toEqual([]);
        });
    });

    describe("getServiceRecommendations", () => {
        it("runs the correct Cypher query and maps results", async () => {
            const records = [buildRecord({ serviceId: "service-1", score: 4 })];
            sessionRunMock.mockResolvedValue({ records });

            const result = await service.getServiceRecommendations("user-id");

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("COMPLETED_SERVICE_WITH"),
                { userId: "user-id" },
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("CREATED_SERVICE"),
                { userId: "user-id" },
            );

            expect(result).toEqual([{ serviceId: "service-1", score: 4 }]);
            expect(sessionCloseMock).toHaveBeenCalled();
        });

        it("returns an empty array when there are no recommendations", async () => {
            sessionRunMock.mockResolvedValue({ records: [] });

            const result = await service.getServiceRecommendations("user-id");

            expect(result).toEqual([]);
        });
    });

    describe("getNeighborRecommendations", () => {
        it("runs the correct Cypher query and maps results", async () => {
            const records = [
                buildRecord({
                    userId: "neighbor-1",
                    firstName: "Alice",
                    lastName: "Martin",
                    weight: 2.5,
                }),
            ];
            sessionRunMock.mockResolvedValue({ records });

            const result = await service.getNeighborRecommendations("user-id");

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("KNOWS"),
                { userId: "user-id" },
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("COMPLETED_SERVICE_WITH"),
                { userId: "user-id" },
            );

            expect(result).toEqual([
                {
                    userId: "neighbor-1",
                    firstName: "Alice",
                    lastName: "Martin",
                    weight: 2.5,
                },
            ]);

            expect(sessionCloseMock).toHaveBeenCalled();
        });

        it("returns an empty array when there are no neighbor suggestions", async () => {
            sessionRunMock.mockResolvedValue({ records: [] });

            const result = await service.getNeighborRecommendations("user-id");

            expect(result).toEqual([]);
        });

        it("closes the session even when the query fails", async () => {
            sessionRunMock.mockRejectedValue(
                new Error("Neo4j connection error"),
            );

            await expect(
                service.getNeighborRecommendations("user-id"),
            ).rejects.toThrow("Neo4j connection error");

            expect(sessionCloseMock).toHaveBeenCalled();
        });
    });
});
