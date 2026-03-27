import type { ObjectId } from "mongodb";

export const OUTBOX_EVENTS_COLLECTION = "outbox_events";
export const OUTBOX_DEAD_LETTER_COLLECTION = "outbox_dead_letters";
export const OUTBOX_PROJECTION_RECEIPTS_COLLECTION =
    "outbox_projection_receipts";

export type OutboxEventStatus =
    | "pending"
    | "processing"
    | "processed"
    | "failed"
    | "dead-letter";

export type OutboxEventDocument = {
    _id?: ObjectId;
    eventId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: OutboxEventStatus;
    attempts: number;
    errorMessage?: string;
    createdAt: Date;
    availableAt: Date;
    processedAt?: Date;
    deadLetteredAt?: Date;
};

export type OutboxDeadLetterDocument = {
    _id?: ObjectId;
    eventId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    attempts: number;
    errorMessage: string;
    createdAt: Date;
    deadLetteredAt: Date;
};

export type OutboxProjectionReceiptDocument = {
    _id?: ObjectId;
    eventId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    projectedAt: Date;
};
