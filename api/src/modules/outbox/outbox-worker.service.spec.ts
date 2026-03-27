import { ConfigService } from "@nestjs/config";
import { OutboxWorkerService } from "src/modules/outbox/outbox-worker.service";

describe("OutboxWorkerService", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("starts interval and dispatches batches periodically", async () => {
        const configService = {
            get: jest.fn((key: string, defaultValue?: string) => {
                if (key === "OUTBOX_CONTINUOUS_ENABLED") return "true";
                if (key === "OUTBOX_POLL_INTERVAL_MS") return 100;
                if (key === "OUTBOX_BATCH_LIMIT") return 7;
                return defaultValue;
            }),
        } as unknown as ConfigService;

        const dispatchPendingBatch = jest
            .fn()
            .mockResolvedValue({ processed: 0 });
        const outboxDispatcherService = {
            dispatchPendingBatch,
        };

        const service = new OutboxWorkerService(
            configService,
            outboxDispatcherService as never,
        );

        service.onApplicationBootstrap();

        jest.advanceTimersByTime(100);
        await Promise.resolve();
        expect(dispatchPendingBatch).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(100);
        await Promise.resolve();
        expect(dispatchPendingBatch).toHaveBeenCalledTimes(2);

        expect(dispatchPendingBatch).toHaveBeenCalledWith(7);

        service.onApplicationShutdown();
    });

    it("does not overlap iterations while previous one is still running", async () => {
        const configService = {
            get: jest.fn((key: string, defaultValue?: string) => {
                if (key === "OUTBOX_CONTINUOUS_ENABLED") return "true";
                if (key === "OUTBOX_POLL_INTERVAL_MS") return 100;
                if (key === "OUTBOX_BATCH_LIMIT") return 10;
                return defaultValue;
            }),
        } as unknown as ConfigService;

        let resolveDispatch: (() => void) | undefined;
        const dispatchPromise = new Promise<void>((resolve) => {
            resolveDispatch = resolve;
        });

        const dispatchPendingBatch = jest.fn().mockReturnValue(dispatchPromise);
        const outboxDispatcherService = {
            dispatchPendingBatch,
        };

        const service = new OutboxWorkerService(
            configService,
            outboxDispatcherService as never,
        );

        service.onApplicationBootstrap();

        jest.advanceTimersByTime(300);
        await Promise.resolve();

        expect(dispatchPendingBatch).toHaveBeenCalledTimes(1);

        resolveDispatch?.();
        await dispatchPromise;

        service.onApplicationShutdown();
    });

    it("does not start when disabled", () => {
        const configService = {
            get: jest.fn((key: string, defaultValue?: string) => {
                if (key === "OUTBOX_CONTINUOUS_ENABLED") return "false";
                return defaultValue;
            }),
        } as unknown as ConfigService;

        const dispatchPendingBatch = jest.fn();
        const outboxDispatcherService = {
            dispatchPendingBatch,
        };

        const service = new OutboxWorkerService(
            configService,
            outboxDispatcherService as never,
        );

        service.onApplicationBootstrap();
        jest.advanceTimersByTime(500);

        expect(dispatchPendingBatch).not.toHaveBeenCalled();

        service.onApplicationShutdown();
    });
});
