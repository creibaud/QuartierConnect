import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ObjectId } from "mongodb";
import {
    OUTBOX_EVENTS_COLLECTION,
    type OutboxDeadLetterDocument,
    type OutboxEventDocument,
    type OutboxProjectionReceiptDocument,
} from "src/database/mongodb/models/outbox-event.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

const OUTBOX_DEAD_LETTER_COLLECTION_NAME = "outbox_dead_letters";
const OUTBOX_PROJECTION_RECEIPTS_COLLECTION_NAME = "outbox_projection_receipts";

export type PublishOutboxEventInput = {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    availableAt?: Date;
};

@Injectable()
export class OutboxService {
    private readonly logger = new Logger(OutboxService.name);

    constructor(@Inject("MONGODB") private readonly mongo: MongoDatabase) {}

    async publish(input: PublishOutboxEventInput) {
        const now = new Date();
        const document: OutboxEventDocument = {
            eventId: randomUUID(),
            aggregateType: input.aggregateType,
            aggregateId: input.aggregateId,
            eventType: input.eventType,
            payload: input.payload,
            status: "pending",
            attempts: 0,
            createdAt: now,
            availableAt: input.availableAt ?? now,
        };

        await this.mongo
            .collection<OutboxEventDocument>(OUTBOX_EVENTS_COLLECTION)
            .insertOne(document);

        this.logger.log(
            `Outbox event published: ${document.eventType} (${document.eventId})`,
        );

        return document;
    }

    async claimPendingBatch(limit = 50) {
        const now = new Date();
        const candidates = await this.mongo
            .collection<OutboxEventDocument>(OUTBOX_EVENTS_COLLECTION)
            .find({
                status: { $in: ["pending", "failed"] },
                availableAt: { $lte: now },
            })
            .sort({ createdAt: 1 })
            .limit(limit)
            .toArray();

        const claimed: OutboxEventDocument[] = [];

        for (const candidate of candidates) {
            if (!candidate._id) {
                continue;
            }

            const result = await this.mongo
                .collection<OutboxEventDocument>(OUTBOX_EVENTS_COLLECTION)
                .updateOne(
                    {
                        _id: candidate._id,
                        status: { $in: ["pending", "failed"] },
                    },
                    {
                        $set: {
                            status: "processing",
                            errorMessage: undefined,
                        },
                    },
                );

            if (result.modifiedCount === 1) {
                claimed.push({ ...candidate, status: "processing" });
            }
        }

        return claimed;
    }

    async markProcessed(eventId: string) {
        await this.mongo
            .collection<OutboxEventDocument>(OUTBOX_EVENTS_COLLECTION)
            .updateOne(
                { eventId },
                {
                    $set: {
                        status: "processed",
                        processedAt: new Date(),
                        errorMessage: undefined,
                    },
                },
            );
    }

    async markFailed(eventId: string, error: string, retryDelayMs = 30_000) {
        await this.mongo
            .collection<OutboxEventDocument>(OUTBOX_EVENTS_COLLECTION)
            .updateOne(
                { eventId },
                {
                    $set: {
                        status: "failed",
                        errorMessage: error,
                        availableAt: new Date(Date.now() + retryDelayMs),
                    },
                    $inc: { attempts: 1 },
                },
            );
    }

    async hasProjectionReceipt(eventId: string) {
        return (
            (await this.mongo
                .collection<OutboxProjectionReceiptDocument>(
                    OUTBOX_PROJECTION_RECEIPTS_COLLECTION_NAME,
                )
                .findOne({ eventId })) !== null
        );
    }

    async createProjectionReceipt(event: OutboxEventDocument) {
        await this.mongo
            .collection<OutboxProjectionReceiptDocument>(
                OUTBOX_PROJECTION_RECEIPTS_COLLECTION_NAME,
            )
            .updateOne(
                { eventId: event.eventId },
                {
                    $setOnInsert: {
                        eventId: event.eventId,
                        eventType: event.eventType,
                        aggregateType: event.aggregateType,
                        aggregateId: event.aggregateId,
                        projectedAt: new Date(),
                    },
                },
                { upsert: true },
            );
    }

    async moveToDeadLetter(event: OutboxEventDocument, error: string) {
        const deadLetteredAt = new Date();
        const attempts = event.attempts + 1;

        const deadLetter: OutboxDeadLetterDocument = {
            eventId: event.eventId,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            eventType: event.eventType,
            payload: event.payload,
            attempts,
            errorMessage: error,
            createdAt: event.createdAt,
            deadLetteredAt,
        };

        await this.mongo
            .collection<OutboxDeadLetterDocument>(
                OUTBOX_DEAD_LETTER_COLLECTION_NAME,
            )
            .updateOne(
                { eventId: event.eventId },
                { $setOnInsert: deadLetter },
                { upsert: true },
            );

        await this.mongo
            .collection<OutboxEventDocument>(OUTBOX_EVENTS_COLLECTION)
            .updateOne(
                { eventId: event.eventId },
                {
                    $set: {
                        status: "dead-letter",
                        errorMessage: error,
                        deadLetteredAt,
                    },
                    $inc: { attempts: 1 },
                },
            );
    }

    async requeueDeadLetter(eventId: string) {
        const now = new Date();

        await this.mongo
            .collection<OutboxEventDocument>(OUTBOX_EVENTS_COLLECTION)
            .updateOne(
                { eventId, status: "dead-letter" },
                {
                    $set: {
                        status: "pending",
                        availableAt: now,
                        errorMessage: undefined,
                        deadLetteredAt: undefined,
                    },
                },
            );

        await this.mongo
            .collection<OutboxDeadLetterDocument>(
                OUTBOX_DEAD_LETTER_COLLECTION_NAME,
            )
            .deleteOne({ eventId });
    }

    async findById(id: string) {
        return this.mongo
            .collection<OutboxEventDocument>(OUTBOX_EVENTS_COLLECTION)
            .findOne({ _id: new ObjectId(id) });
    }
}
