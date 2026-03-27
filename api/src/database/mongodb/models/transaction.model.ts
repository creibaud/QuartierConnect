import type { ObjectId } from "mongodb";

export const TRANSACTIONS_COLLECTION = "transactions";

export type TransactionType = "service_exchange" | "adjustment" | "refund";

export type TransactionDocument = {
    _id?: ObjectId;
    fromUserId: string;
    toUserId: string;
    serviceId?: string;
    type: TransactionType;
    pointsAmount: number;
    description?: string;
    createdAt: Date;
};
