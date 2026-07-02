import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Neo4jError } from "neo4j-driver";
import { NEO4J_DRIVER } from "./neo4j/neo4j.provider";
import { SocialService } from "./social.service";

const retriableError = () =>
    new Neo4jError("transient", "ServiceUnavailable", "02000", "No data");
const nonRetriableError = () =>
    new Neo4jError(
        "syntax error",
        "Neo.ClientError.Statement.SyntaxError",
        "42001",
        "Syntax error",
    );

const mockSession = {
    run: jest.fn(),
    close: jest.fn(),
};

const mockDriver = {
    session: jest.fn().mockReturnValue(mockSession),
};

describe("SocialService", () => {
    let service: SocialService;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.useRealTimers();
        mockDriver.session.mockReturnValue(mockSession);
        mockSession.close.mockResolvedValue(undefined);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SocialService,
                { provide: NEO4J_DRIVER, useValue: mockDriver },
            ],
        }).compile();

        service = module.get<SocialService>(SocialService);
        jest.spyOn(Logger.prototype, "warn").mockImplementation(
            () => undefined,
        );
    });

    const recommendationRecord = (map: Record<string, unknown>) => ({
        get: (key: string) => map[key],
    });

    describe("getRecommendations", () => {
        it("returns recommendations from Neo4j records", async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    recommendationRecord({
                        type: "service",
                        id: "svc-1",
                        name: "Bakery",
                        score: 3,
                        reason: "serviceInNeighborhood",
                    }),
                ],
            });

            const result = await service.getRecommendations("user-1");
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe("service");
            expect(result[0].name).toBe("Bakery");
            expect(result[0].score).toBe(3);
            expect(result[0].reason).toBe("serviceInNeighborhood");
        });

        it("handles Neo4j integer score (toNumber)", async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    recommendationRecord({
                        type: "event",
                        id: "evt-1",
                        name: "Market",
                        score: { toNumber: () => 2 },
                        reason: "upcomingEventNearby",
                    }),
                ],
            });

            const result = await service.getRecommendations("user-1");
            expect(result[0].score).toBe(2);
        });

        it("deduplicates entries sharing the same type and name", async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    recommendationRecord({
                        type: "service",
                        id: "svc-1",
                        name: "Garde d'animaux",
                        score: 3,
                        reason: "serviceInNeighborhood",
                    }),
                    recommendationRecord({
                        type: "service",
                        id: "svc-2",
                        name: "garde d'animaux ",
                        score: 3,
                        reason: "serviceInNeighborhood",
                    }),
                    recommendationRecord({
                        type: "event",
                        id: "evt-1",
                        name: "Garde d'animaux",
                        score: 2,
                        reason: "upcomingEventNearby",
                    }),
                ],
            });

            const result = await service.getRecommendations("user-1");
            expect(result).toHaveLength(2);
            expect(result.map((r) => r.id)).toEqual(["svc-1", "evt-1"]);
        });

        it("sorts by score descending and caps the list at 10", async () => {
            const records = Array.from({ length: 8 }, (_, i) =>
                recommendationRecord({
                    type: "event",
                    id: `evt-${i}`,
                    name: `Event ${i}`,
                    score: 2,
                    reason: "upcomingEventNearby",
                }),
            ).concat(
                Array.from({ length: 4 }, (_, i) =>
                    recommendationRecord({
                        type: "service",
                        id: `svc-${i}`,
                        name: `Service ${i}`,
                        score: 3,
                        reason: "serviceInNeighborhood",
                    }),
                ),
            );
            mockSession.run.mockResolvedValue({ records });

            const result = await service.getRecommendations("user-1");
            expect(result).toHaveLength(10);
            expect(result[0].score).toBe(3);
            expect(result.slice(0, 4).every((r) => r.score === 3)).toBe(true);
        });

        it("returns empty array when Neo4j query fails", async () => {
            mockSession.run.mockRejectedValue(retriableError());

            const result = await service.getRecommendations("user-1");
            expect(result).toEqual([]);
        });

        it("maps sharedInterests and reliableNeighbor reason codes", async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    recommendationRecord({
                        type: "event",
                        id: "evt-9",
                        name: "Atelier compost",
                        score: 4,
                        reason: "sharedInterests",
                    }),
                    recommendationRecord({
                        type: "neighbor",
                        id: "user-9",
                        name: "Alice Martin",
                        score: 6,
                        reason: "reliableNeighbor",
                    }),
                ],
            });

            const result = await service.getRecommendations("user-1");
            expect(result[0]).toMatchObject({
                type: "neighbor",
                reason: "reliableNeighbor",
                score: 6,
            });
            expect(result[1]).toMatchObject({
                type: "event",
                reason: "sharedInterests",
                score: 4,
            });
        });

        it("keeps the highest-scored variant when an event matches several reasons", async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    recommendationRecord({
                        type: "event",
                        id: "evt-1",
                        name: "Atelier compost",
                        score: 2,
                        reason: "upcomingEventNearby",
                    }),
                    recommendationRecord({
                        type: "event",
                        id: "evt-1",
                        name: "Atelier compost",
                        score: 4,
                        reason: "sharedInterests",
                    }),
                ],
            });

            const result = await service.getRecommendations("user-1");
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                score: 4,
                reason: "sharedInterests",
            });
        });

        it("queries shared interests and reliable neighbors in the graph", async () => {
            mockSession.run.mockResolvedValue({ records: [] });

            await service.getRecommendations("user-1");

            const query = mockSession.run.mock.calls[0][0] as string;
            expect(query).toContain("'sharedInterests' AS reason");
            expect(query).toContain("'reliableNeighbor' AS reason");
            expect(query).toContain("[h:HELPED]");
        });
    });

    describe("syncUser", () => {
        it("syncs user without neighborhood", async () => {
            mockSession.run.mockResolvedValue({});

            await service.syncUser("user-1");
            expect(mockSession.run).toHaveBeenCalledTimes(1);
            expect(mockSession.close).toHaveBeenCalled();
        });

        it("syncs user with neighborhood", async () => {
            mockSession.run.mockResolvedValue({});

            await service.syncUser("user-1", "nb-1");
            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });

        it("swallows Neo4j errors after all retries exhausted", async () => {
            jest.useFakeTimers();
            mockSession.run.mockRejectedValue(retriableError());

            const syncPromise = service.syncUser("user-1");
            await jest.runAllTimersAsync();
            await syncPromise;

            expect(mockSession.run).toHaveBeenCalledTimes(3);
        });

        it("retries on transient failure and succeeds", async () => {
            jest.useFakeTimers();
            mockSession.run
                .mockRejectedValueOnce(retriableError())
                .mockResolvedValue({});

            const syncPromise = service.syncUser("user-1");
            await jest.runAllTimersAsync();
            await syncPromise;

            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });

        it("does not retry on non-retriable errors", async () => {
            mockSession.run.mockRejectedValue(nonRetriableError());

            await service.syncUser("user-1");

            expect(mockSession.run).toHaveBeenCalledTimes(1);
        });
    });

    describe("syncNeighborhood", () => {
        it("syncs neighborhood successfully", async () => {
            mockSession.run.mockResolvedValue({});

            await service.syncNeighborhood("nb-1", "Marais");
            expect(mockSession.run).toHaveBeenCalledTimes(1);
            expect(mockSession.close).toHaveBeenCalled();
        });

        it("retries on transient failure and succeeds", async () => {
            jest.useFakeTimers();
            mockSession.run
                .mockRejectedValueOnce(retriableError())
                .mockResolvedValue({});

            const syncPromise = service.syncNeighborhood("nb-1", "Marais");
            await jest.runAllTimersAsync();
            await syncPromise;

            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });

        it("swallows error after all retries exhausted", async () => {
            jest.useFakeTimers();
            mockSession.run.mockRejectedValue(retriableError());

            const syncPromise = service.syncNeighborhood("nb-1", "Marais");
            await jest.runAllTimersAsync();
            await syncPromise;

            expect(mockSession.run).toHaveBeenCalledTimes(3);
        });
    });

    describe("syncService", () => {
        it("syncs service without neighborhood", async () => {
            mockSession.run.mockResolvedValue({});

            await service.syncService("svc-1", "Bakery");
            expect(mockSession.run).toHaveBeenCalledTimes(1);
        });

        it("syncs service with neighborhood", async () => {
            mockSession.run.mockResolvedValue({});

            await service.syncService("svc-1", "Bakery", "nb-1");
            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });

        it("retries on transient failure and succeeds", async () => {
            jest.useFakeTimers();
            mockSession.run
                .mockRejectedValueOnce(retriableError())
                .mockResolvedValue({});

            const syncPromise = service.syncService("svc-1", "Bakery");
            await jest.runAllTimersAsync();
            await syncPromise;

            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });

        it("swallows error after all retries exhausted", async () => {
            jest.useFakeTimers();
            mockSession.run.mockRejectedValue(retriableError());

            const syncPromise = service.syncService("svc-1", "Bakery");
            await jest.runAllTimersAsync();
            await syncPromise;

            expect(mockSession.run).toHaveBeenCalledTimes(3);
        });
    });

    describe("syncEvent", () => {
        it("syncs event without neighborhood", async () => {
            mockSession.run.mockResolvedValue({});

            await service.syncEvent("evt-1", "Fete", new Date());
            expect(mockSession.run).toHaveBeenCalledTimes(1);
        });

        it("syncs event with neighborhood", async () => {
            mockSession.run.mockResolvedValue({});

            await service.syncEvent("evt-1", "Fete", new Date(), "nb-1");
            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });

        it("retries on transient failure and succeeds", async () => {
            jest.useFakeTimers();
            mockSession.run
                .mockRejectedValueOnce(retriableError())
                .mockResolvedValue({});

            const syncPromise = service.syncEvent("evt-1", "Fete", new Date());
            await jest.runAllTimersAsync();
            await syncPromise;

            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });

        it("swallows error after all retries exhausted", async () => {
            jest.useFakeTimers();
            mockSession.run.mockRejectedValue(retriableError());

            const syncPromise = service.syncEvent("evt-1", "Fete", new Date());
            await jest.runAllTimersAsync();
            await syncPromise;

            expect(mockSession.run).toHaveBeenCalledTimes(3);
        });
    });

    describe("deleteNode", () => {
        it("deletes node successfully", async () => {
            mockSession.run.mockResolvedValue({});

            await service.deleteNode("Service", "svc-1");
            expect(mockSession.run).toHaveBeenCalledTimes(1);
            expect(mockSession.close).toHaveBeenCalled();
        });

        it("retries on transient failure and succeeds", async () => {
            jest.useFakeTimers();
            mockSession.run
                .mockRejectedValueOnce(retriableError())
                .mockResolvedValue({});

            const deletePromise = service.deleteNode("Service", "svc-1");
            await jest.runAllTimersAsync();
            await deletePromise;

            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });

        it("swallows error after all retries exhausted", async () => {
            jest.useFakeTimers();
            mockSession.run.mockRejectedValue(retriableError());

            const deletePromise = service.deleteNode("Service", "svc-1");
            await jest.runAllTimersAsync();
            await deletePromise;

            expect(mockSession.run).toHaveBeenCalledTimes(3);
        });
    });

    describe("recordEventInterest", () => {
        const lastRunQuery = (): string =>
            mockSession.run.mock.calls.at(-1)?.[0] as string;

        it("records swipe interest as INTERESTED_IN", async () => {
            mockSession.run.mockResolvedValue({});

            const result = await service.recordEventInterest(
                "user-1",
                "evt-1",
                { interested: true },
            );
            expect(result).toEqual({ success: true });
            expect(mockSession.run).toHaveBeenCalledTimes(1);
            expect(lastRunQuery()).toContain("[r:INTERESTED_IN]");
        });

        it("records participation as ATTENDING", async () => {
            mockSession.run.mockResolvedValue({});

            const result = await service.recordEventInterest(
                "user-1",
                "evt-1",
                { interested: true, source: "participate" },
            );
            expect(result).toEqual({ success: true });
            expect(lastRunQuery()).toContain("[r:ATTENDING]");
        });

        it("records disinterest as NOT_INTERESTED_IN regardless of source", async () => {
            mockSession.run.mockResolvedValue({});

            const result = await service.recordEventInterest(
                "user-1",
                "evt-1",
                { interested: false, source: "participate" },
            );
            expect(result).toEqual({ success: true });
            expect(lastRunQuery()).toContain("[r:NOT_INTERESTED_IN]");
        });

        it("returns success: false after all retries exhausted", async () => {
            jest.useFakeTimers();
            mockSession.run.mockRejectedValue(retriableError());

            const resultPromise = service.recordEventInterest(
                "user-1",
                "evt-1",
                { interested: true },
            );
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toEqual({ success: false });
            expect(mockSession.run).toHaveBeenCalledTimes(3);
        });

        it("retries on transient failure and returns success: true", async () => {
            jest.useFakeTimers();
            mockSession.run
                .mockRejectedValueOnce(retriableError())
                .mockResolvedValue({});

            const resultPromise = service.recordEventInterest(
                "user-1",
                "evt-1",
                { interested: true },
            );
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toEqual({ success: true });
            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });
    });

    describe("recordHelpRendered", () => {
        const help = {
            payerId: "payer-1",
            payeeId: "payee-1",
            serviceId: "svc-1",
            points: 12,
        };

        it("merges a HELPED relation with service, points and timestamp", async () => {
            mockSession.run.mockResolvedValue({});

            await service.recordHelpRendered(help);

            expect(mockSession.run).toHaveBeenCalledTimes(1);
            const [query, params] = mockSession.run.mock.calls[0];
            expect(query).toContain("HELPED {serviceId: $serviceId}");
            expect(query).toContain("h.points = $points");
            expect(params).toEqual(help);
            expect(mockSession.close).toHaveBeenCalled();
        });

        it("retries on transient failure and succeeds", async () => {
            jest.useFakeTimers();
            mockSession.run
                .mockRejectedValueOnce(retriableError())
                .mockResolvedValue({});

            const helpPromise = service.recordHelpRendered(help);
            await jest.runAllTimersAsync();
            await helpPromise;

            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });

        it("swallows the error after all retries exhausted", async () => {
            jest.useFakeTimers();
            mockSession.run.mockRejectedValue(retriableError());

            const helpPromise = service.recordHelpRendered(help);
            await jest.runAllTimersAsync();
            await expect(helpPromise).resolves.toBeUndefined();

            expect(mockSession.run).toHaveBeenCalledTimes(3);
        });
    });
});
