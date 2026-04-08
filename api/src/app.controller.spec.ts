import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { DRIZZLE_TOKEN } from "./database/drizzle.module";
import { NeighborhoodsService } from "./neighborhoods/neighborhoods.service";

function makeMockDb(resolveWith: Array<{ value: number }>): unknown {
    function makeChain(): any {
        const chain: any = {
            from: jest.fn().mockImplementation(makeChain),
            where: jest.fn().mockImplementation(makeChain),
            then(
                resolve: (v: typeof resolveWith) => unknown,
                reject: (r: unknown) => unknown,
            ) {
                return Promise.resolve(resolveWith).then(resolve, reject);
            },
            catch(fn: (r: unknown) => unknown) {
                return Promise.resolve(resolveWith).catch(fn);
            },
            finally(fn: () => void) {
                return Promise.resolve(resolveWith).finally(fn);
            },
        };
        return chain;
    }
    return { select: jest.fn().mockImplementation(makeChain) };
}

describe("AppController", () => {
    let appController: AppController;
    let neighborhoodsService: jest.Mocked<NeighborhoodsService>;

    beforeEach(async () => {
        const mockNeighborhoodsService = {
            count: jest.fn().mockResolvedValue(5),
        };
        const mockDb = makeMockDb([{ value: 10 }]);

        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                { provide: DRIZZLE_TOKEN, useValue: mockDb },
                {
                    provide: NeighborhoodsService,
                    useValue: mockNeighborhoodsService,
                },
            ],
        }).compile();

        appController = app.get<AppController>(AppController);
        neighborhoodsService = app.get(NeighborhoodsService);
    });

    it("returns health status", () => {
        const result = appController.health();
        expect(result.status).toBe("ok");
        expect(result.timestamp).toBeTruthy();
    });

    it("getStats returns correct counts", async () => {
        const result = await appController.getStats();
        expect(result.users).toBe(10);
        expect(result.incidents).toBe(10);
        expect(result.neighborhoods).toBe(5);
        expect(result.activeIncidents).toBe(10);
    });

    it("getStats returns null for a failing neighborhoods count", async () => {
        neighborhoodsService.count.mockRejectedValue(new Error("DB down"));
        const result = await appController.getStats();
        expect(result.neighborhoods).toBeNull();
    });

    it("getStats defaults to 0 when DB returns empty array", async () => {
        const emptyDb = makeMockDb([]);
        const module2 = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                { provide: DRIZZLE_TOKEN, useValue: emptyDb },
                {
                    provide: NeighborhoodsService,
                    useValue: { count: jest.fn().mockResolvedValue(5) },
                },
            ],
        }).compile();
        const ctrl2 = module2.get<AppController>(AppController);
        const result = await ctrl2.getStats();
        expect(result.users).toBe(0);
        expect(result.incidents).toBe(0);
        expect(result.activeIncidents).toBe(0);
    });
});
