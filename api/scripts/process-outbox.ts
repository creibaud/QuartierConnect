import "dotenv/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { OutboxDispatcherService } from "src/modules/outbox/outbox-dispatcher.service";

const logger = new Logger("process-outbox");

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ["error", "warn", "log"],
    });

    try {
        const outboxDispatcher = app.get(OutboxDispatcherService);
        const result = await outboxDispatcher.dispatchPendingBatch();
        logger.log(`Outbox batch processed: ${result.processed}`);
    } finally {
        await app.close();
    }
}

void main().catch((error: unknown) => {
    logger.error("Outbox worker failed", error);
    process.exit(1);
});
