import "dotenv/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { OutboxService } from "src/modules/outbox/outbox.service";

const logger = new Logger("requeue-dead-letter");

async function main() {
    const eventId = process.argv[2];

    if (!eventId) {
        throw new Error(
            "Missing eventId argument. Usage: pnpm outbox:requeue <eventId>",
        );
    }

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ["error", "warn", "log"],
    });

    try {
        const outboxService = app.get(OutboxService);
        await outboxService.requeueDeadLetter(eventId);
        logger.log(`Outbox dead-letter requeued: ${eventId}`);
    } finally {
        await app.close();
    }
}

void main().catch((error: unknown) => {
    logger.error("Dead-letter requeue failed", error);
    process.exit(1);
});
