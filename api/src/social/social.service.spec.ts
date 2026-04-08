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

    describe("getRecommendations", () => {
        it("returns recommendations from Neo4j records", async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    {
                        get: (key: string) => {
                            const map: Record<string, unknown> = {
                                type: "service",
                                id: "svc-1",
                                name: "Bakery",
                                score: 3,
                                reason: "Service in your neighborhood",
                            };
                            return map[key];
                        },
                    },
                ],
            });

            const result = await service.getRecommendations("user-1");
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe("service");
            expect(result[0].name).toBe("Bakery");
            expect(result[0].score).toBe(3);
        });

        it("handles Neo4j integer score (toNumber)", async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    {
                        get: (key: string) => {
                            const map: Record<string, unknown> = {
                                type: "event",
                                id: "evt-1",
                                name: "Market",
                                score: { toNumber: () => 2 },
                                reason: "Upcoming event near you",
                            };
                            return map[key];
                        },
                    },
                ],
            });

            const result = await service.getRecommendations("user-1");
            expect(result[0].score).toBe(2);
        });

        it("returns empty array when Neo4j query fails", async () => {
            mockSession.run.mockRejectedValue(retriableError());

            const result = await service.getRecommendations("user-1");
            expect(result).toEqual([]);
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
        it("records interest successfully", async () => {
            mockSession.run.mockResolvedValue({});

            const result = await service.recordEventInterest(
                "user-1",
                "evt-1",
                true,
            );
            expect(result).toEqual({ success: true });
            expect(mockSession.run).toHaveBeenCalledTimes(1);
        });

        it("records disinterest successfully", async () => {
            mockSession.run.mockResolvedValue({});

            const result = await service.recordEventInterest(
                "user-1",
                "evt-1",
                false,
            );
            expect(result).toEqual({ success: true });
        });

        it("returns success: false after all retries exhausted", async () => {
            jest.useFakeTimers();
            mockSession.run.mockRejectedValue(retriableError());

            const resultPromise = service.recordEventInterest(
                "user-1",
                "evt-1",
                true,
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
                true,
            );
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toEqual({ success: true });
            expect(mockSession.run).toHaveBeenCalledTimes(2);
        });
    });
});
