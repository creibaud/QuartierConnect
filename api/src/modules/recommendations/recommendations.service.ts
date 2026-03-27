import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";

@Injectable()
export class RecommendationsService {
    private readonly logger = new Logger(RecommendationsService.name);

    constructor(@Inject("NEO4J") private readonly neo4j: Neo4jDriver) {}

    async getEventRecommendations(userId: string) {
        const session = this.neo4j.session();
        try {
            const result = await session.run(
                `MATCH (me:User {id: $userId})-[r:INTERESTED_IN_CATEGORY]->(c:Category)
                 MATCH (e:Event)-[:IN_CATEGORY]->(c)
                 WHERE NOT (me)-[:PARTICIPATED_IN]->(e)
                                     AND NOT (me)-[:INTERESTED_IN]->(e)
                 RETURN e.id AS eventId, e.title AS title, sum(r.score) AS score
                 ORDER BY score DESC LIMIT 10`,
                { userId },
            );

            this.logger.log(`Event recommendations fetched for user ${userId}`);

            return result.records.map((record) => ({
                eventId: record.get("eventId") as string,
                title: record.get("title") as string,
                score: (
                    record.get("score") as { toNumber: () => number }
                ).toNumber(),
            }));
        } finally {
            await session.close();
        }
    }

    async getServiceRecommendations(userId: string) {
        const session = this.neo4j.session();
        try {
            const result = await session.run(
                `MATCH (me:User {id: $userId})-[:COMPLETED_SERVICE_WITH]-(neighbor:User)
                 MATCH (neighbor)-[:CREATED_SERVICE]->(s:Service)
                 WHERE s.status = 'open'
                   AND NOT (me)-[:CREATED_SERVICE]->(s)
                                 RETURN s.id AS serviceId, s.title AS title, count(neighbor) AS score
                 ORDER BY score DESC LIMIT 10`,
                { userId },
            );

            this.logger.log(
                `Service recommendations fetched for user ${userId}`,
            );

            return result.records.map((record) => ({
                serviceId: record.get("serviceId") as string,
                title: record.get("title") as string,
                score: (
                    record.get("score") as { toNumber: () => number }
                ).toNumber(),
            }));
        } finally {
            await session.close();
        }
    }

    async getNeighborRecommendations(userId: string) {
        const session = this.neo4j.session();
        try {
            const result = await session.run(
                `MATCH (me:User {id: $userId})-[k:KNOWS]->(neighbor:User)
                 WHERE NOT (me)-[:COMPLETED_SERVICE_WITH]->(neighbor)
                 RETURN neighbor.id AS userId, neighbor.firstName AS firstName,
                        neighbor.lastName AS lastName, k.weight AS weight
                 ORDER BY weight DESC LIMIT 20`,
                { userId },
            );

            this.logger.log(
                `Neighbor recommendations fetched for user ${userId}`,
            );

            return result.records.map((record) => ({
                userId: record.get("userId") as string,
                firstName: record.get("firstName") as string,
                lastName: record.get("lastName") as string,
                weight: (
                    record.get("weight") as { toNumber: () => number }
                ).toNumber(),
            }));
        } finally {
            await session.close();
        }
    }
}
