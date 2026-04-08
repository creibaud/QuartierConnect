import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { NEO4J_DRIVER } from "./neo4j/neo4j.provider";
import { SocialService } from "./social.service";

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
            mockSession.run.mockRejectedValue(new Error("Neo4j down"));

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

        it("swallows Neo4j errors silently", async () => {
            mockSession.run.mockRejectedValue(new Error("Connection lost"));

            await expect(service.syncUser("user-1")).resolves.toBeUndefined();
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
    });
});
