import { Inject, Injectable, Logger } from "@nestjs/common";
import { Driver, Neo4jError } from "neo4j-driver";
import { NEO4J_DRIVER } from "./neo4j/neo4j.provider";

export interface Recommendation {
    type: "service" | "event" | "neighbor";
    id: string;
    name: string;
    score: number;
    reason: string;
}

@Injectable()
export class SocialService {
    private readonly logger = new Logger(SocialService.name);

    constructor(@Inject(NEO4J_DRIVER) private readonly driver: Driver) {}

    private isRetriable(error: unknown): boolean {
        if (error instanceof Neo4jError) {
            return [
                "ServiceUnavailable",
                "SessionExpired",
                "TransientError",
            ].some((code) => error.code.startsWith(code));
        }
        return false;
    }

    private async withRetry<T>(
        operation: () => Promise<T>,
        maxAttempts = 3,
    ): Promise<T> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (attempt === maxAttempts || !this.isRetriable(error)) {
                    throw error;
                }
                await new Promise((r) =>
                    setTimeout(r, 100 * 2 ** (attempt - 1)),
                );
            }
        }
        throw lastError;
    }

    async getRecommendations(userId: string): Promise<Recommendation[]> {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
        MATCH (u:User {id: $userId})-[:LIVES_IN]->(n:Neighborhood)
        OPTIONAL MATCH (n)<-[:LOCATED_IN]-(s:Service)
        WHERE NOT (u)-[:USED]->(s)
        WITH s, n, 3 AS score, 'service' AS type, 'Service in your neighborhood' AS reason
        RETURN s.id AS id, s.name AS name, type, score, reason
        UNION
        MATCH (u:User {id: $userId})-[:LIVES_IN]->(n:Neighborhood)
        OPTIONAL MATCH (n)<-[:HELD_IN]-(e:Event)
        WHERE NOT (u)-[:ATTENDING]->(e) AND e.date > datetime()
        WITH e, n, 2 AS score, 'event' AS type, 'Upcoming event near you' AS reason
        RETURN e.id AS id, e.name AS name, type, score, reason
        ORDER BY score DESC
        LIMIT 10
        `,
                { userId },
            );

            return result.records.map((record) => {
                const rawScore = record.get("score") as
                    | { toNumber?: () => number }
                    | number;
                const score =
                    typeof rawScore === "object" && rawScore.toNumber
                        ? rawScore.toNumber()
                        : (rawScore as number);
                return {
                    type: record.get("type") as
                        | "service"
                        | "event"
                        | "neighbor",
                    id: record.get("id") as string,
                    name: record.get("name") as string,
                    score,
                    reason: record.get("reason") as string,
                };
            });
        } catch (error) {
            this.logger.warn(`Neo4j query failed, returning empty: ${error}`);
            return [];
        } finally {
            await session.close();
        }
    }

    async syncNeighborhood(
        neighborhoodId: string,
        name: string,
    ): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    await session.run(
                        `MERGE (n:Neighborhood {id: $neighborhoodId})
         ON CREATE SET n.name = $name, n.createdAt = datetime()
         ON MATCH SET n.name = $name, n.updatedAt = datetime()`,
                        { neighborhoodId, name },
                    );
                } finally {
                    await session.close();
                }
            });
        } catch (error) {
            this.logger.warn(
                `Neo4j syncNeighborhood failed after retries: ${error}`,
            );
        }
    }

    async deleteNode(
        label: "Neighborhood" | "Service" | "Event" | "User",
        id: string,
    ): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    await session.run(
                        `MATCH (n:${label} {id: $id}) DETACH DELETE n`,
                        { id },
                    );
                } finally {
                    await session.close();
                }
            });
        } catch (error) {
            this.logger.warn(
                `Neo4j deleteNode (${label}:${id}) failed after retries: ${error}`,
            );
        }
    }

    async syncUser(userId: string, neighborhoodId?: string): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    await session.run(
                        `MERGE (u:User {id: $userId})
         ON CREATE SET u.createdAt = datetime()
         ON MATCH SET u.updatedAt = datetime()`,
                        { userId },
                    );

                    if (neighborhoodId) {
                        await session.run(
                            `MERGE (n:Neighborhood {id: $neighborhoodId})
           WITH n
           MATCH (u:User {id: $userId})
           MERGE (u)-[:LIVES_IN]->(n)`,
                            { userId, neighborhoodId },
                        );
                    }
                } finally {
                    await session.close();
                }
            });
        } catch (error) {
            this.logger.warn(`Neo4j syncUser failed after retries: ${error}`);
        }
    }

    async syncService(
        serviceId: string,
        name: string,
        neighborhoodId?: string,
    ): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    await session.run(
                        `MERGE (s:Service {id: $serviceId})
         ON CREATE SET s.name = $name, s.createdAt = datetime()
         ON MATCH SET s.name = $name, s.updatedAt = datetime()`,
                        { serviceId, name },
                    );

                    if (neighborhoodId) {
                        await session.run(
                            `MERGE (n:Neighborhood {id: $neighborhoodId})
           WITH n
           MATCH (s:Service {id: $serviceId})
           MERGE (s)-[:LOCATED_IN]->(n)`,
                            { serviceId, neighborhoodId },
                        );
                    }
                } finally {
                    await session.close();
                }
            });
        } catch (error) {
            this.logger.warn(
                `Neo4j syncService failed after retries: ${error}`,
            );
        }
    }

    async recordEventInterest(
        userId: string,
        eventId: string,
        interested: boolean,
    ): Promise<{ success: boolean }> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    const relation = interested
                        ? "INTERESTED_IN"
                        : "NOT_INTERESTED_IN";
                    await session.run(
                        `MERGE (u:User {id: $userId})
         MERGE (e:Event {id: $eventId})
         MERGE (u)-[r:${relation}]->(e)
         ON CREATE SET r.timestamp = datetime()`,
                        { userId, eventId },
                    );
                } finally {
                    await session.close();
                }
            });
            return { success: true };
        } catch (error) {
            this.logger.warn(
                `Neo4j recordEventInterest failed after retries: ${error}`,
            );
            return { success: false };
        }
    }

    async syncEvent(
        eventId: string,
        name: string,
        date: Date,
        neighborhoodId?: string,
    ): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    await session.run(
                        `MERGE (e:Event {id: $eventId})
         ON CREATE SET e.name = $name, e.date = datetime($date), e.createdAt = datetime()
         ON MATCH SET e.name = $name, e.date = datetime($date), e.updatedAt = datetime()`,
                        { eventId, name, date: date.toISOString() },
                    );

                    if (neighborhoodId) {
                        await session.run(
                            `MERGE (n:Neighborhood {id: $neighborhoodId})
           WITH n
           MATCH (e:Event {id: $eventId})
           MERGE (e)-[:HELD_IN]->(n)`,
                            { eventId, neighborhoodId },
                        );
                    }
                } finally {
                    await session.close();
                }
            });
        } catch (error) {
            this.logger.warn(`Neo4j syncEvent failed after retries: ${error}`);
        }
    }
}
