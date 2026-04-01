import { sql } from "drizzle-orm";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { incidents, quartiers, users } from "src/database/drizzle/schema";
import { EVENTS_COLLECTION } from "src/database/mongodb/models/event.model";
import { MESSAGES_COLLECTION } from "src/database/mongodb/models/message.model";
import { SERVICES_COLLECTION } from "src/database/mongodb/models/service.model";
import { VOTES_COLLECTION } from "src/database/mongodb/models/vote.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

export interface IGlobalCounts {
    users: number;
    quartiers: number;
    incidents: number;
    events: number;
    services: number;
    messages: number;
    votes: number;
}

export class AdminGlobalRepository {
    constructor(
        private readonly db: DrizzleDB,
        private readonly mongo: MongoDatabase,
    ) {}

    async getGlobalCounts(): Promise<IGlobalCounts> {
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

    async getUsersByRole(): Promise<{ role: string; count: number }[]> {
        const rows = await this.db
            .select({ role: users.role, count: sql<number>`count(*)` })
            .from(users)
            .groupBy(users.role);

        return rows.map((r) => ({ role: r.role, count: Number(r.count) }));
    }

    async getUsersByStatus(): Promise<{ isActive: boolean; count: number }[]> {
        const rows = await this.db
            .select({
                isActive: users.isActive,
                count: sql<number>`count(*)`,
            })
            .from(users)
            .groupBy(users.isActive);

        return rows.map((r) => ({
            isActive: r.isActive,
            count: Number(r.count),
        }));
    }
}
