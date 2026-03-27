import { ConfigService } from "@nestjs/config";
import { OutboxDispatcherService } from "src/modules/outbox/outbox-dispatcher.service";

describe("OutboxDispatcherService", () => {
    const configService = {
        get: jest.fn((key: string) => {
            switch (key) {
                case "OUTBOX_MAX_ATTEMPTS":
                    return 3;
                case "OUTBOX_RETRY_DELAY_MS":
                    return 1_000;
                case "OUTBOX_RETRY_MAX_DELAY_MS":
                    return 60_000;
                default:
                    return undefined;
            }
        }),
    } as unknown as ConfigService;

    const outboxService = {
        claimPendingBatch: jest.fn(),
        hasProjectionReceipt: jest.fn(),
        createProjectionReceipt: jest.fn(),
        markProcessed: jest.fn(),
        markFailed: jest.fn(),
        moveToDeadLetter: jest.fn(),
    };

    const projectionService = {
        project: jest.fn(),
    };

    const service = new OutboxDispatcherService(
        configService,
        outboxService as never,
        projectionService as never,
    );

    const event = {
        eventId: "evt-1",
        aggregateType: "service",
        aggregateId: "service-1",
        eventType: "service.created",
        payload: { id: "service-1" },
        status: "processing" as const,
        attempts: 0,
        createdAt: new Date(),
        availableAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("marks already projected events as processed without replay", async () => {
        outboxService.claimPendingBatch.mockResolvedValue([event]);
        outboxService.hasProjectionReceipt.mockResolvedValue(true);

        await service.dispatchPendingBatch(10);

        expect(projectionService.project).not.toHaveBeenCalled();
        expect(outboxService.markProcessed).toHaveBeenCalledWith("evt-1");
    });

    it("creates projection receipt then marks processed on success", async () => {
        outboxService.claimPendingBatch.mockResolvedValue([event]);
        outboxService.hasProjectionReceipt.mockResolvedValue(false);
        projectionService.project.mockResolvedValue(undefined);

        await service.dispatchPendingBatch(10);

        expect(projectionService.project).toHaveBeenCalledWith(event);
        expect(outboxService.createProjectionReceipt).toHaveBeenCalledWith(
            event,
        );
        expect(outboxService.markProcessed).toHaveBeenCalledWith("evt-1");
        expect(outboxService.markFailed).not.toHaveBeenCalled();
    });

    it("marks failed with exponential retry delay under max attempts", async () => {
        const retryEvent = { ...event, attempts: 1 };
        outboxService.claimPendingBatch.mockResolvedValue([retryEvent]);
        outboxService.hasProjectionReceipt.mockResolvedValue(false);
        projectionService.project.mockRejectedValue(new Error("neo4j down"));

        await service.dispatchPendingBatch(10);

        expect(outboxService.markFailed).toHaveBeenCalledWith(
            "evt-1",
            "neo4j down",
            2_000,
        );
        expect(outboxService.moveToDeadLetter).not.toHaveBeenCalled();
    });

    it("moves event to dead-letter when max attempts is reached", async () => {
        const lastAttemptEvent = { ...event, attempts: 2 };
        outboxService.claimPendingBatch.mockResolvedValue([lastAttemptEvent]);
        outboxService.hasProjectionReceipt.mockResolvedValue(false);
        projectionService.project.mockRejectedValue(
            new Error("invalid payload"),
        );

        await service.dispatchPendingBatch(10);

        expect(outboxService.moveToDeadLetter).toHaveBeenCalledWith(
            lastAttemptEvent,
            "invalid payload",
        );
        expect(outboxService.markFailed).not.toHaveBeenCalled();
    });
});
