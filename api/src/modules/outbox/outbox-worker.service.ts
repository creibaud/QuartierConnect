import {
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OutboxDispatcherService } from "src/modules/outbox/outbox-dispatcher.service";

@Injectable()
export class OutboxWorkerService
    implements OnApplicationBootstrap, OnApplicationShutdown
{
    private readonly logger = new Logger(OutboxWorkerService.name);
    private timer: NodeJS.Timeout | null = null;
    private isRunning = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly outboxDispatcherService: OutboxDispatcherService,
    ) {}

    onApplicationBootstrap() {
        if (!this.isEnabled) {
            this.logger.log("Outbox continuous worker disabled");
            return;
        }

        this.timer = setInterval(() => {
            void this.processBatch();
        }, this.pollIntervalMs);

        this.timer.unref();

        this.logger.log(
            `Outbox continuous worker started (interval=${this.pollIntervalMs}ms, batchLimit=${this.batchLimit})`,
        );
    }

    onApplicationShutdown() {
        if (!this.timer) {
            return;
        }

        clearInterval(this.timer);
        this.timer = null;
        this.logger.log("Outbox continuous worker stopped");
    }

    private get isEnabled() {
        const raw = this.configService.get<string>(
            "OUTBOX_CONTINUOUS_ENABLED",
            "true",
        );

        return !["false", "0", "no", "off"].includes(String(raw).toLowerCase());
    }

    private get pollIntervalMs() {
        return Number(
            this.configService.get("OUTBOX_POLL_INTERVAL_MS") ?? 5_000,
        );
    }

    private get batchLimit() {
        return Number(this.configService.get("OUTBOX_BATCH_LIMIT") ?? 50);
    }

    private async processBatch() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        try {
            await this.outboxDispatcherService.dispatchPendingBatch(
                this.batchLimit,
            );
        } catch (error) {
            this.logger.error(
                "Outbox continuous worker iteration failed",
                error,
            );
        } finally {
            this.isRunning = false;
        }
    }
}
