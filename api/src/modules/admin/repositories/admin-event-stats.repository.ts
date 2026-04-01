import { EVENTS_COLLECTION } from "src/database/mongodb/models/event.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

type GroupCountRow = { _id: string | null; count: number };
type RegistrationStatsRow = {
    _id: null;
    totalRegistrations: number;
    avgRegistrations: number;
};

export class AdminEventStatsRepository {
    constructor(private readonly mongo: MongoDatabase) {}

    async getByCategory(
        dateFilter: Record<string, unknown>,
    ): Promise<{ category: string; count: number }[]> {
        const rows = await this.mongo
            .collection(EVENTS_COLLECTION)
            .aggregate<GroupCountRow>([
                { $match: dateFilter },
                { $group: { _id: "$category", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ])
            .toArray();

        return rows.map((r) => ({
            category: r._id ?? "unknown",
            count: r.count,
        }));
    }

    async getRegistrationStats(
        dateFilter: Record<string, unknown>,
    ): Promise<RegistrationStatsRow | null> {
        const rows = await this.mongo
            .collection(EVENTS_COLLECTION)
            .aggregate<RegistrationStatsRow>([
                { $match: dateFilter },
                {
                    $group: {
                        _id: null,
                        totalRegistrations: { $sum: "$registrationCount" },
                        avgRegistrations: { $avg: "$registrationCount" },
                    },
                },
            ])
            .toArray();

        return rows[0] ?? null;
    }
}
