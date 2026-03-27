import { Inject, Injectable } from "@nestjs/common";
import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";

interface Neo4jUserProjection {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    updatedAt?: Date | string | null;
}

@Injectable()
export class Neo4jSyncService {
    constructor(@Inject("NEO4J") private readonly neo4j: Neo4jDriver) {}

    async upsertUser(user: Neo4jUserProjection) {
        await this.run(
            `MERGE (u:User {id: $id})
             SET u.email = $email,
                 u.firstName = $firstName,
                 u.lastName = $lastName,
                 u.role = $role,
                 u.isActive = $isActive,
                 u.updatedAt = $updatedAt`,
            {
                ...user,
                updatedAt: this.toIsoString(user.updatedAt),
            },
        );
    }

    async anonymizeUser(userId: string) {
        await this.run(
            `MATCH (u:User {id: $userId})
             SET u.firstName = '[deleted]',
                 u.lastName = '[deleted]',
                 u.email = '[deleted]',
                 u.isActive = false,
                 u.updatedAt = $updatedAt`,
            { userId, updatedAt: new Date().toISOString() },
        );
    }

    async createQuartier(id: string, name: string) {
        await this.run("CREATE (:Quartier {id: $id, name: $name})", {
            id,
            name,
        });
    }

    async updateQuartierName(id: string, name: string) {
        await this.run("MATCH (q:Quartier {id: $id}) SET q.name = $name", {
            id,
            name,
        });
    }

    async deleteQuartier(id: string) {
        await this.run("MATCH (q:Quartier {id: $id}) DETACH DELETE q", { id });
    }

    async assignUserToQuartier(user: Neo4jUserProjection, quartierId: string) {
        await this.run(
            `MERGE (u:User {id: $userId})
             SET u.email = $email,
                 u.firstName = $firstName,
                 u.lastName = $lastName,
                 u.role = $role,
                 u.isActive = $isActive,
                 u.updatedAt = $updatedAt
             MERGE (q:Quartier {id: $quartierId})
             MERGE (u)-[:LIVES_IN]->(q)`,
            {
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive,
                updatedAt: this.toIsoString(user.updatedAt),
                quartierId,
            },
        );
    }

    async removeUserFromQuartier(userId: string, quartierId: string) {
        await this.run(
            "MATCH (u:User {id: $userId})-[r:LIVES_IN]->(q:Quartier {id: $quartierId}) DELETE r",
            { userId, quartierId },
        );
    }

    async createEventWithCreator(args: {
        id: string;
        title: string;
        category: string;
        startDate: Date;
        createdAt: Date;
        creatorId: string;
    }) {
        const createdAt = args.createdAt.toISOString();
        await this.run(
            `CREATE (e:Event {id: $id, title: $title, category: $category, startDate: $startDate, createdAt: $createdAt})`,
            {
                id: args.id,
                title: args.title,
                category: args.category,
                startDate: args.startDate.toISOString(),
                createdAt,
            },
        );

        await this.run(
            `MATCH (e:Event {id: $id})
             MERGE (u:User {id: $creatorId})
             MERGE (u)-[:CREATED_EVENT]->(e)`,
            {
                id: args.id,
                creatorId: args.creatorId,
            },
        );
    }

    async updateEvent(args: {
        id: string;
        title?: string;
        category?: string;
        startDate?: string;
        updatedAt: Date;
    }) {
        await this.run(
            `MATCH (e:Event {id: $id})
             SET e.title = coalesce($title, e.title),
                 e.category = coalesce($category, e.category),
                 e.startDate = coalesce($startDate, e.startDate),
                 e.updatedAt = $updatedAt`,
            {
                id: args.id,
                title: args.title ?? null,
                category: args.category ?? null,
                startDate: args.startDate
                    ? new Date(args.startDate).toISOString()
                    : null,
                updatedAt: args.updatedAt.toISOString(),
            },
        );
    }

    async deleteEvent(id: string) {
        await this.run("MATCH (e:Event {id: $id}) DETACH DELETE e", { id });
    }

    async registerUserToEvent(userId: string, eventId: string, date: Date) {
        await this.run(
            `MERGE (u:User {id: $userId})-[r:PARTICIPATED_IN {registeredAt: $date}]->(e:Event {id: $eventId})`,
            { userId, eventId, date: date.toISOString() },
        );

        await this.run(
            `MATCH (creator:User)-[:CREATED_EVENT]->(e:Event {id: $eventId}), (participant:User {id: $userId})
             MERGE (creator)-[k:KNOWS]->(participant)
             ON CREATE SET k.weight = 1, k.since = $date
             ON MATCH SET k.weight = k.weight + 0.5`,
            { eventId, userId, date: date.toISOString() },
        );
    }

    async cancelEventRegistration(userId: string, eventId: string) {
        await this.run(
            `MATCH (u:User {id: $userId})-[r:PARTICIPATED_IN]->(e:Event {id: $eventId}) DELETE r`,
            { userId, eventId },
        );
    }

    async likeEvent(userId: string, eventId: string, date: Date) {
        await this.run(
            `MERGE (u:User {id: $userId})-[r:INTERESTED_IN]->(e:Event {id: $eventId})
             ON CREATE SET r.score = 1, r.updatedAt = $date
             ON MATCH SET r.score = r.score + 1, r.updatedAt = $date`,
            { userId, eventId, date: date.toISOString() },
        );

        await this.run(
            `MATCH (e:Event {id: $eventId})
             MERGE (u:User {id: $userId})-[r:INTERESTED_IN_CATEGORY]->(c:Category {name: e.category})
             ON CREATE SET r.score = 1, r.updatedAt = $date
             ON MATCH SET r.score = r.score + 1, r.updatedAt = $date`,
            { userId, eventId, date: date.toISOString() },
        );
    }

    async createServiceWithCreator(args: {
        id: string;
        title: string;
        category: string;
        creatorId: string;
        createdAt: Date;
    }) {
        await this.run(
            `MERGE (u:User {id: $creatorId})
             CREATE (s:Service {id: $id, title: $title, category: $category, status: 'open', createdAt: $date})
             CREATE (u)-[:CREATED_SERVICE]->(s)`,
            {
                creatorId: args.creatorId,
                id: args.id,
                title: args.title,
                category: args.category,
                date: args.createdAt.toISOString(),
            },
        );
    }

    async updateService(args: {
        id: string;
        title?: string;
        category?: string;
        updatedAt: Date;
    }) {
        await this.run(
            `MATCH (s:Service {id: $id})
             SET s.title = coalesce($title, s.title),
                 s.category = coalesce($category, s.category),
                 s.updatedAt = $updatedAt`,
            {
                id: args.id,
                title: args.title ?? null,
                category: args.category ?? null,
                updatedAt: args.updatedAt.toISOString(),
            },
        );
    }

    async setServiceStatus(id: string, status: string, updatedAt?: Date) {
        await this.run(
            `MATCH (s:Service {id: $id})
             SET s.status = $status,
                 s.updatedAt = $updatedAt`,
            {
                id,
                status,
                updatedAt: (updatedAt ?? new Date()).toISOString(),
            },
        );
    }

    async deleteService(id: string) {
        await this.run("MATCH (s:Service {id: $id}) DETACH DELETE s", { id });
    }

    async completeService(args: {
        creatorId: string;
        acceptorId: string;
        serviceId: string;
        points: number;
        date: Date;
    }) {
        await this.run(
            `MERGE (creator:User {id: $creatorId})
             MERGE (acceptor:User {id: $acceptorId})
             MERGE (creator)-[r:COMPLETED_SERVICE_WITH {serviceId: $serviceId, points: $points, completedAt: $date}]->(acceptor)
             MERGE (creator)-[k:KNOWS]->(acceptor)
             ON MATCH SET k.weight = k.weight + 1
             ON CREATE SET k.weight = 1, k.since = $date
             WITH creator, acceptor
             MATCH (s:Service {id: $serviceId})
             SET s.status = 'completed'`,
            {
                creatorId: args.creatorId,
                acceptorId: args.acceptorId,
                serviceId: args.serviceId,
                points: args.points,
                date: args.date.toISOString(),
            },
        );
    }

    private async run(query: string, params: Record<string, unknown>) {
        const session = this.neo4j.session();
        try {
            await session.run(query, params);
        } finally {
            await session.close();
        }
    }

    private toIsoString(value?: Date | string | null) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === "string") {
            return value;
        }
        return new Date().toISOString();
    }
}
