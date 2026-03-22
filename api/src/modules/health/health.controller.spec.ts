import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "src/modules/health/health.controller";

describe("HealthController", () => {
    let controller: HealthController;

    const pgExecuteMock = jest.fn();
    const mongoCommandMock = jest.fn();
    const neo4jVerifyMock = jest.fn();

    beforeEach(async () => {
        pgExecuteMock.mockReset();
        mongoCommandMock.mockReset();
        neo4jVerifyMock.mockReset();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: "DRIZZLE",
                    useValue: { execute: pgExecuteMock },
                },
                {
                    provide: "MONGODB",
                    useValue: { command: mongoCommandMock },
                },
                {
                    provide: "NEO4J",
                    useValue: { verifyConnectivity: neo4jVerifyMock },
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
    });

    describe("check", () => {
        it("returns ok when all databases are reachable", async () => {
            pgExecuteMock.mockResolvedValue([{ 1: 1 }]);
            mongoCommandMock.mockResolvedValue({});
            neo4jVerifyMock.mockResolvedValue(undefined);

            const result = await controller.check();

            expect(result.status).toBe("ok");
            expect(result.databases.postgres).toBe(true);
            expect(result.databases.mongodb).toBe(true);
            expect(result.databases.neo4j).toBe(true);
            expect(result.app).toBe("running");
            expect(typeof result.timestamp).toBe("string");
        });

        it("returns degraded when postgres fails", async () => {
            pgExecuteMock.mockRejectedValue(new Error("pg down"));
            mongoCommandMock.mockResolvedValue({});
            neo4jVerifyMock.mockResolvedValue(undefined);

            const result = await controller.check();

            expect(result.status).toBe("degraded");
            expect(result.databases.postgres).toBe(false);
            expect(result.databases.mongodb).toBe(true);
            expect(result.databases.neo4j).toBe(true);
        });

        it("returns degraded when mongodb fails", async () => {
            pgExecuteMock.mockResolvedValue([{ 1: 1 }]);
            mongoCommandMock.mockRejectedValue(new Error("mongo down"));
            neo4jVerifyMock.mockResolvedValue(undefined);

            const result = await controller.check();

            expect(result.status).toBe("degraded");
            expect(result.databases.postgres).toBe(true);
            expect(result.databases.mongodb).toBe(false);
            expect(result.databases.neo4j).toBe(true);
        });

        it("returns degraded when neo4j fails", async () => {
            pgExecuteMock.mockResolvedValue([{ 1: 1 }]);
            mongoCommandMock.mockResolvedValue({});
            neo4jVerifyMock.mockRejectedValue(new Error("neo4j down"));

            const result = await controller.check();

            expect(result.status).toBe("degraded");
            expect(result.databases.postgres).toBe(true);
            expect(result.databases.mongodb).toBe(true);
            expect(result.databases.neo4j).toBe(false);
        });

        it("returns degraded when all databases fail", async () => {
            pgExecuteMock.mockRejectedValue(new Error("pg down"));
            mongoCommandMock.mockRejectedValue(new Error("mongo down"));
            neo4jVerifyMock.mockRejectedValue(new Error("neo4j down"));

            const result = await controller.check();

            expect(result.status).toBe("degraded");
            expect(result.databases.postgres).toBe(false);
            expect(result.databases.mongodb).toBe(false);
            expect(result.databases.neo4j).toBe(false);
        });
    });
});
