import { SERVICES_COLLECTION } from "src/database/mongodb/models/service.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

type GroupCountRow = { _id: string | null; count: number };

export class AdminServiceStatsRepository {
    constructor(private readonly mongo: MongoDatabase) {}

    async getByCategory(): Promise<{ category: string; count: number }[]> {
        const rows = await this.mongo
            .collection(SERVICES_COLLECTION)
            .aggregate<GroupCountRow>([
                { $group: { _id: "$category", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ])
            .toArray();

        return rows.map((r) => ({
            category: r._id ?? "unknown",
            count: r.count,
        }));
    }

    async getByType(): Promise<{ type: string; count: number }[]> {
        const rows = await this.mongo
            .collection(SERVICES_COLLECTION)
            .aggregate<GroupCountRow>([
                { $group: { _id: "$type", count: { $sum: 1 } } },
            ])
            .toArray();

        return rows.map((r) => ({
            type: r._id ?? "unknown",
            count: r.count,
        }));
    }

    async getByStatus(): Promise<{ status: string; count: number }[]> {
        const rows = await this.mongo
            .collection(SERVICES_COLLECTION)
            .aggregate<GroupCountRow>([
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ])
            .toArray();

        return rows.map((r) => ({
            status: r._id ?? "unknown",
            count: r.count,
        }));
    }
}
