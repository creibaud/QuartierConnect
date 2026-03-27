import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { ObjectId } from "mongodb";
import { buildPaginatedResult } from "src/common/query/query.helper";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { users } from "src/database/drizzle/schema";
import { TRANSACTIONS_COLLECTION } from "src/database/mongodb/models/transaction.model";
import type { TransactionDocument } from "src/database/mongodb/models/transaction.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import type { AdjustmentDto } from "src/modules/transactions/dto/adjustment.dto";
import type { TransactionQueryDto } from "src/modules/transactions/dto/transaction-query.dto";

@Injectable()
export class TransactionsService {
    private readonly logger = new Logger(TransactionsService.name);

    constructor(
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        @Inject("DRIZZLE") private readonly db: DrizzleDB,
    ) {}

    async findMyHistory(userId: string, query: TransactionQueryDto) {
        const { page = 1, limit = 10 } = query;
        const filter: Record<string, unknown> = {
            $or: [{ fromUserId: userId }, { toUserId: userId }],
        };

        if (query.type) filter.type = query.type;

        const collection = this.mongo.collection<TransactionDocument>(
            TRANSACTIONS_COLLECTION,
        );
        const skip = (page - 1) * limit;

        const [documents, total] = await Promise.all([
            collection
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(filter),
        ]);

        return buildPaginatedResult(
            documents.map(this.mapToResponse),
            total,
            page,
            limit,
        );
    }

    async findAll(query: TransactionQueryDto) {
        const { page = 1, limit = 10 } = query;
        const filter: Record<string, unknown> = {};

        if (query.type) filter.type = query.type;
        if (query.fromUserId) filter.fromUserId = query.fromUserId;
        if (query.toUserId) filter.toUserId = query.toUserId;

        const collection = this.mongo.collection<TransactionDocument>(
            TRANSACTIONS_COLLECTION,
        );
        const skip = (page - 1) * limit;

        const [documents, total] = await Promise.all([
            collection
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(filter),
        ]);

        return buildPaginatedResult(
            documents.map(this.mapToResponse),
            total,
            page,
            limit,
        );
    }

    async findOne(id: string) {
        const document = await this.mongo
            .collection<TransactionDocument>(TRANSACTIONS_COLLECTION)
            .findOne({ _id: new ObjectId(id) });

        if (!document) {
            throw new NotFoundException("Transaction not found");
        }

        return this.mapToResponse(document);
    }

    async createAdjustment(adminId: string, dto: AdjustmentDto) {
        const now = new Date();

        const transaction: Omit<TransactionDocument, "_id"> = {
            fromUserId: adminId,
            toUserId: dto.userId,
            type: "adjustment",
            pointsAmount: dto.pointsAmount,
            description: dto.description,
            createdAt: now,
        };

        await this.mongo
            .collection<TransactionDocument>(TRANSACTIONS_COLLECTION)
            .insertOne({ ...transaction });

        await this.db
            .update(users)
            .set({
                balance: sql`${users.balance} + ${dto.pointsAmount}`,
                updatedAt: now,
            })
            .where(
                eq(
                    users.id,
                    dto.userId as `${string}-${string}-${string}-${string}-${string}`,
                ),
            );

        this.logger.log(
            `Balance adjustment for user ${dto.userId}: ${dto.pointsAmount} points by admin ${adminId}`,
        );

        return transaction;
    }

    private readonly mapToResponse = (
        document: TransactionDocument & { _id?: ObjectId },
    ) => {
        const { _id, ...rest } = document;
        return { ...rest, id: _id?.toHexString() ?? "" };
    };
}
