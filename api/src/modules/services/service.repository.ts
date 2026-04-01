import type { UUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { ObjectId, type Collection } from "mongodb";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { pointConfig, users } from "src/database/drizzle/schema";
import type { ServiceCategory } from "src/database/drizzle/schema";
import {
    SERVICE_RATINGS_COLLECTION,
    SERVICES_COLLECTION,
    type ServiceDocument,
    type ServiceRatingDocument,
} from "src/database/mongodb/models/service.model";
import {
    TRANSACTIONS_COLLECTION,
    type TransactionDocument,
} from "src/database/mongodb/models/transaction.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

export interface ServiceQueryFilters {
    category?: string;
    type?: string;
    status?: string;
    quartierId?: string;
    search?: string;
}

export interface IServicesRepository {
    insertService(doc: ServiceDocument): Promise<ObjectId>;
    findServices(
        filter: Record<string, unknown>,
        skip: number,
        limit: number,
    ): Promise<ServiceDocument[]>;
    countServices(filter: Record<string, unknown>): Promise<number>;
    findServiceById(id: string): Promise<ServiceDocument | null>;
    updateService(id: string, data: Partial<ServiceDocument>): Promise<void>;
    deleteService(id: string): Promise<void>;
    findRating(
        serviceId: string,
        raterUserId: string,
    ): Promise<ServiceRatingDocument | null>;
    insertRating(data: Omit<ServiceRatingDocument, "_id">): Promise<void>;
    insertTransaction(data: Omit<TransactionDocument, "_id">): Promise<void>;
    getPointConfigForCategory(
        category: ServiceCategory,
    ): Promise<{ basePointsPerHour: number; multiplier: number }>;
    getUserBalance(userId: string): Promise<number | null>;
    deductUserBalance(userId: string, amount: number, at: Date): Promise<void>;
    addUserBalance(userId: string, amount: number, at: Date): Promise<void>;
}

export class ServicesRepository implements IServicesRepository {
    private readonly services: Collection<ServiceDocument>;
    private readonly ratings: Collection<ServiceRatingDocument>;
    private readonly transactions: Collection<TransactionDocument>;

    constructor(
        private readonly mongo: MongoDatabase,
        private readonly db: DrizzleDB,
    ) {
        this.services = mongo.collection<ServiceDocument>(SERVICES_COLLECTION);
        this.ratings = mongo.collection<ServiceRatingDocument>(
            SERVICE_RATINGS_COLLECTION,
        );
        this.transactions = mongo.collection<TransactionDocument>(
            TRANSACTIONS_COLLECTION,
        );
    }

    async insertService(doc: ServiceDocument): Promise<ObjectId> {
        const result = await this.services.insertOne(doc);
        return result.insertedId;
    }

    async findServices(
        filter: Record<string, unknown>,
        skip: number,
        limit: number,
    ): Promise<ServiceDocument[]> {
        return this.services
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
    }

    async countServices(filter: Record<string, unknown>): Promise<number> {
        return this.services.countDocuments(filter);
    }

    async findServiceById(id: string): Promise<ServiceDocument | null> {
        return this.services.findOne({ _id: new ObjectId(id) });
    }

    async updateService(
        id: string,
        data: Partial<ServiceDocument>,
    ): Promise<void> {
        await this.services.updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: new Date() } },
        );
    }

    async deleteService(id: string): Promise<void> {
        await this.services.deleteOne({ _id: new ObjectId(id) });
    }

    async findRating(
        serviceId: string,
        raterUserId: string,
    ): Promise<ServiceRatingDocument | null> {
        return this.ratings.findOne({ serviceId, raterUserId });
    }

    async insertRating(
        data: Omit<ServiceRatingDocument, "_id">,
    ): Promise<void> {
        await this.ratings.insertOne({ ...data });
    }

    async insertTransaction(
        data: Omit<TransactionDocument, "_id">,
    ): Promise<void> {
        await this.transactions.insertOne({ ...data });
    }

    async getPointConfigForCategory(
        category: ServiceCategory,
    ): Promise<{ basePointsPerHour: number; multiplier: number }> {
        const [row] = await this.db
            .select()
            .from(pointConfig)
            .where(eq(pointConfig.category, category))
            .limit(1);

        return {
            basePointsPerHour: row ? Number(row.basePointsPerHour) : 2,
            multiplier: row ? Number(row.multiplier) : 1,
        };
    }

    async getUserBalance(userId: string): Promise<number | null> {
        const [user] = await this.db
            .select({ balance: users.balance })
            .from(users)
            .where(eq(users.id, userId as UUID))
            .limit(1);

        return user ? Number(user.balance) : null;
    }

    async deductUserBalance(
        userId: string,
        amount: number,
        at: Date,
    ): Promise<void> {
        await this.db
            .update(users)
            .set({
                balance: sql`${users.balance} - ${amount}`,
                updatedAt: at,
            })
            .where(eq(users.id, userId as UUID));
    }

    async addUserBalance(
        userId: string,
        amount: number,
        at: Date,
    ): Promise<void> {
        await this.db
            .update(users)
            .set({
                balance: sql`${users.balance} + ${amount}`,
                updatedAt: at,
            })
            .where(eq(users.id, userId as UUID));
    }
}
