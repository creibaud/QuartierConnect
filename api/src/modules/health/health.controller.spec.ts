import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
    let controller: HealthController;
    const executeMock = jest.fn();

    beforeEach(async () => {
        executeMock.mockReset();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: "DRIZZLE",
                    useValue: {
                        execute: executeMock,
                    },
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
    });

    describe("check", () => {
        it("should return healthy status when database is reachable", async () => {
            executeMock.mockResolvedValue([{ result: 1 }]);

            const result = await controller.check();

            expect(executeMock).toHaveBeenCalledTimes(1);
            expect(result.status).toBe("ok");
            expect(result.database).toBe("connected");
            expect(result.app).toBe("running");
            expect(typeof result.timestamp).toBe("string");
        });

        it("should return degraded status when database query fails", async () => {
            const dbError = new Error("db unavailable");
            executeMock.mockRejectedValue(dbError);
            const errorSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => undefined);

            const result = await controller.check();

            expect(executeMock).toHaveBeenCalledTimes(1);
            expect(result.status).toBe("error");
            expect(result.database).toBe("disconnected");
            expect(result.app).toBe("running");
            expect(typeof result.timestamp).toBe("string");
            expect(errorSpy).toHaveBeenCalledWith(
                "Database health check failed:",
                dbError,
            );

            errorSpy.mockRestore();
        });
    });
});
