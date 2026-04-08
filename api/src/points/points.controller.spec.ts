import { Test, TestingModule } from "@nestjs/testing";
import { PointsController } from "./points.controller";
import { PointsService } from "./points.service";

const authReq = (sub = "user-uuid-1") => ({ user: { sub } });

describe("PointsController", () => {
    let controller: PointsController;
    let service: jest.Mocked<PointsService>;

    beforeEach(async () => {
        service = {
            getBalance: jest.fn().mockResolvedValue({ balance: 100 }),
            getHistory: jest
                .fn()
                .mockResolvedValue([{ id: "tx-1", amount: 10 }]),
            transfer: jest.fn().mockResolvedValue(undefined),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PointsController],
            providers: [{ provide: PointsService, useValue: service }],
        }).compile();

        controller = module.get<PointsController>(PointsController);
    });

    it("GET /points/balance returns balance for JWT user", async () => {
        const result = await controller.getBalance(authReq() as any);
        expect(result).toEqual({ balance: 100 });
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(service.getBalance).toHaveBeenCalledWith("user-uuid-1");
    });

    it("GET /points/history returns paginated history with explicit page/limit", async () => {
        await controller.getHistory(authReq() as any, "2", "10");
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(service.getHistory).toHaveBeenCalledWith("user-uuid-1", 2, 10);
    });

    it("GET /points/history uses default page=1 limit=20 when not provided", async () => {
        await controller.getHistory(authReq() as any);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(service.getHistory).toHaveBeenCalledWith("user-uuid-1", 1, 20);
    });

    it("POST /points/transfer calls transfer service", async () => {
        await controller.transfer(
            { recipientId: "recv-id", amount: 50 },
            authReq() as any,
        );
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(service.transfer).toHaveBeenCalledWith("user-uuid-1", {
            recipientId: "recv-id",
            amount: 50,
        });
    });
});
