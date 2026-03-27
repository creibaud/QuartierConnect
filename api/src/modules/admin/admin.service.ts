import { Inject, Injectable, Logger } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { incidents, quartiers, users } from "src/database/drizzle/schema";
import { EVENTS_COLLECTION } from "src/database/mongodb/models/event.model";
import { MESSAGES_COLLECTION } from "src/database/mongodb/models/message.model";
import { SERVICES_COLLECTION } from "src/database/mongodb/models/service.model";
import {
    VOTE_RESPONSES_COLLECTION,
    VOTES_COLLECTION,
} from "src/database/mongodb/models/vote.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        @Inject("DRIZZLE") private readonly db: DrizzleDB,
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
    ) {}

    async getGlobalStats() {
        const [
            [{ userCount }],
            [{ quartierCount }],
            [{ incidentCount }],
            eventCount,
            serviceCount,
            messageCount,
            voteCount,
        ] = await Promise.all([
            this.db.select({ userCount: sql<number>`count(*)` }).from(users),
            this.db
                .select({ quartierCount: sql<number>`count(*)` })
                .from(quartiers),
            this.db
                .select({ incidentCount: sql<number>`count(*)` })
                .from(incidents),
            this.mongo.collection(EVENTS_COLLECTION).countDocuments(),
            this.mongo.collection(SERVICES_COLLECTION).countDocuments(),
            this.mongo.collection(MESSAGES_COLLECTION).countDocuments(),
            this.mongo.collection(VOTES_COLLECTION).countDocuments(),
        ]);

        return {
            users: Number(userCount),
            quartiers: Number(quartierCount),
            incidents: Number(incidentCount),
            events: eventCount,
            services: serviceCount,
            messages: messageCount,
            votes: voteCount,
        };
    }

    async getEventStats(period?: "week" | "month" | "year") {
        const now = new Date();
        const dateFilter: Record<string, unknown> = {};

        if (period) {
            const from = new Date(now);
            if (period === "week") from.setDate(from.getDate() - 7);
            else if (period === "month") from.setMonth(from.getMonth() - 1);
            else if (period === "year")
                from.setFullYear(from.getFullYear() - 1);
            dateFilter.createdAt = { $gte: from };
        }

        const byCategory = await this.mongo
            .collection(EVENTS_COLLECTION)
            .aggregate([
                { $match: dateFilter },
                { $group: { _id: "$category", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ])
            .toArray();

        const byRegistrations = await this.mongo
            .collection(EVENTS_COLLECTION)
            .aggregate([
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

        return {
            byCategory: byCategory.map((b) => ({
                category: b._id,
                count: b.count,
            })),
            registrationStats: byRegistrations[0] ?? {
                totalRegistrations: 0,
                avgRegistrations: 0,
            },
        };
    }

    async getServiceStats() {
        const [byCategory, byType, byStatus] = await Promise.all([
            this.mongo
                .collection(SERVICES_COLLECTION)
                .aggregate([
                    { $group: { _id: "$category", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                ])
                .toArray(),
            this.mongo
                .collection(SERVICES_COLLECTION)
                .aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }])
                .toArray(),
            this.mongo
                .collection(SERVICES_COLLECTION)
                .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
                .toArray(),
        ]);

        return {
            byCategory: byCategory.map((b) => ({
                category: b._id,
                count: b.count,
            })),
            byType: byType.map((b) => ({ type: b._id, count: b.count })),
            byStatus: byStatus.map((b) => ({ status: b._id, count: b.count })),
        };
    }

    async getMessageStats() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [total, byDay] = await Promise.all([
            this.mongo.collection(MESSAGES_COLLECTION).countDocuments(),
            this.mongo
                .collection(MESSAGES_COLLECTION)
                .aggregate([
                    { $match: { createdAt: { $gte: sevenDaysAgo } } },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$createdAt",
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),
        ]);

        return {
            total,
            last7Days: byDay.map((d) => ({ date: d._id, count: d.count })),
        };
    }

    async getVoteStats() {
        const [byType, totalResponses] = await Promise.all([
            this.mongo
                .collection(VOTES_COLLECTION)
                .aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }])
                .toArray(),
            this.mongo.collection(VOTE_RESPONSES_COLLECTION).countDocuments(),
        ]);

        return {
            byType: byType.map((b) => ({ type: b._id, count: b.count })),
            totalResponses,
        };
    }

    async getUserStats() {
        const [byRole, byStatus] = await Promise.all([
            this.db
                .select({ role: users.role, count: sql<number>`count(*)` })
                .from(users)
                .groupBy(users.role),
            this.db
                .select({
                    isActive: users.isActive,
                    count: sql<number>`count(*)`,
                })
                .from(users)
                .groupBy(users.isActive),
        ]);

        return {
            byRole: byRole.map((r) => ({
                role: r.role,
                count: Number(r.count),
            })),
            byStatus: byStatus.map((s) => ({
                isActive: s.isActive,
                count: Number(s.count),
            })),
        };
    }
}
