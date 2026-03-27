import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OutboxProjectionService } from "src/modules/outbox/outbox-projection.service";
import { OutboxService } from "src/modules/outbox/outbox.service";

@Injectable()
export class OutboxDispatcherService {
    private readonly logger = new Logger(OutboxDispatcherService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly outboxService: OutboxService,
        private readonly outboxProjectionService: OutboxProjectionService,
    ) {}

    private get maxAttempts() {
        return Number(this.configService.get("OUTBOX_MAX_ATTEMPTS") ?? 5);
    }

    private get baseRetryDelayMs() {
        return Number(
            this.configService.get("OUTBOX_RETRY_DELAY_MS") ?? 30_000,
        );
    }

    private get maxRetryDelayMs() {
        return Number(
            this.configService.get("OUTBOX_RETRY_MAX_DELAY_MS") ?? 300_000,
        );
    }

    private computeRetryDelay(nextAttempt: number) {
        const exponentialDelay = this.baseRetryDelayMs * 2 ** (nextAttempt - 1);
        return Math.min(exponentialDelay, this.maxRetryDelayMs);
    }

    async dispatchPendingBatch(limit = 50) {
        const pendingEvents = await this.outboxService.claimPendingBatch(limit);

        for (const event of pendingEvents) {
            try {
                const alreadyProjected =
                    await this.outboxService.hasProjectionReceipt(
                        event.eventId,
                    );

                if (alreadyProjected) {
                    await this.outboxService.markProcessed(event.eventId);
                    continue;
                }

                await this.outboxProjectionService.project(event);
                await this.outboxService.createProjectionReceipt(event);
                await this.outboxService.markProcessed(event.eventId);
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Unknown outbox dispatch error";

                const nextAttempt = event.attempts + 1;

                if (nextAttempt >= this.maxAttempts) {
                    await this.outboxService.moveToDeadLetter(event, message);
                    this.logger.error(
                        `Outbox event moved to dead-letter: ${event.eventType} (${event.eventId})`,
                    );
                    continue;
                }

                await this.outboxService.markFailed(
                    event.eventId,
                    message,
                    this.computeRetryDelay(nextAttempt),
                );
            }
        }

        return { processed: pendingEvents.length };
    }
}
