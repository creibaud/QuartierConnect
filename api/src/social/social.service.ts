import { Inject, Injectable, Logger } from "@nestjs/common";
import { Driver, Neo4jError, Record as Neo4jRecord } from "neo4j-driver";
import { NEO4J_DRIVER } from "./neo4j/neo4j.provider";

export type RecommendationReason =
    | "serviceInNeighborhood"
    | "upcomingEventNearby"
    | "sharedInterests"
    | "reliableNeighbor";

export interface Recommendation {
    type: "service" | "event" | "neighbor";
    id: string;
    name: string;
    score: number;
    reason: RecommendationReason;
}

export type ParticipationSource = "swipe" | "participate";

export interface EventParticipation {
    interested: boolean;
    source?: ParticipationSource;
}

export interface HelpRendered {
    payerId: string;
    payeeId: string;
    serviceId: string;
    points: number;
}

const MAX_RECOMMENDATIONS = 10;

const RECOMMENDATIONS_QUERY = `
MATCH (u:User {id: $userId})-[:LIVES_IN]->(n:Neighborhood)
MATCH (n)<-[:LOCATED_IN]-(s:Service)
WHERE NOT (u)-[:USED]->(s)
  AND (s.createdBy IS NULL OR s.createdBy <> $userId)
RETURN s.id AS id, s.name AS name, 'service' AS type, 3 AS score,
       'serviceInNeighborhood' AS reason
UNION
MATCH (u:User {id: $userId})-[:LIVES_IN]->(n:Neighborhood)
MATCH (n)<-[:HELD_IN]-(e:Event)
WHERE NOT (u)-[:ATTENDING]->(e)
  AND e.date > datetime()
  AND (e.createdBy IS NULL OR e.createdBy <> $userId)
RETURN e.id AS id, e.name AS name, 'event' AS type, 2 AS score,
       'upcomingEventNearby' AS reason
UNION
MATCH (u:User {id: $userId})-[:INTERESTED_IN|ATTENDING]->(:Event)
      <-[:INTERESTED_IN|ATTENDING]-(peer:User)
WHERE peer.id <> $userId
MATCH (peer)-[:INTERESTED_IN|ATTENDING]->(e:Event)
WHERE NOT (u)-[:INTERESTED_IN|ATTENDING]->(e)
  AND NOT (u)-[:NOT_INTERESTED_IN]->(e)
  AND e.date > datetime()
  AND (e.createdBy IS NULL OR e.createdBy <> $userId)
WITH e, count(DISTINCT peer) AS peerCount
RETURN e.id AS id, e.name AS name, 'event' AS type, 3 + peerCount AS score,
       'sharedInterests' AS reason
UNION
MATCH (u:User {id: $userId})-[:LIVES_IN]->(:Neighborhood)
      <-[:LIVES_IN]-(peer:User)
WHERE peer.id <> $userId
MATCH (peer)<-[h:HELPED]-(:User)
WITH u, peer, count(h) AS helpCount
OPTIONAL MATCH (u)-[:INTERESTED_IN|ATTENDING]->(shared:Event)
               <-[:INTERESTED_IN|ATTENDING]-(peer)
WITH peer, helpCount, count(DISTINCT shared) AS sharedEvents
RETURN peer.id AS id, coalesce(peer.name, peer.id) AS name,
       'neighbor' AS type, 4 + helpCount + sharedEvents AS score,
       'reliableNeighbor' AS reason
`;

function resolveParticipationRelation(
    participation: EventParticipation,
): "INTERESTED_IN" | "ATTENDING" | "NOT_INTERESTED_IN" {
    if (!participation.interested) return "NOT_INTERESTED_IN";
    return participation.source === "participate"
        ? "ATTENDING"
        : "INTERESTED_IN";
}

function toRecommendation(record: Neo4jRecord): Recommendation {
    const rawScore = record.get("score") as
        | { toNumber?: () => number }
        | number;
    const score =
        typeof rawScore === "object" && rawScore.toNumber
            ? rawScore.toNumber()
            : (rawScore as number);
    return {
        type: record.get("type") as Recommendation["type"],
        id: record.get("id") as string,
        name: record.get("name") as string,
        score,
        reason: record.get("reason") as RecommendationReason,
    };
}

function dedupeByTypeAndName(
    recommendations: Recommendation[],
): Recommendation[] {
    const seen = new Set<string>();
    return recommendations.filter((recommendation) => {
        const key = `${recommendation.type}:${recommendation.name.trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
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
            const result = await session.run(RECOMMENDATIONS_QUERY, {
                userId,
            });
            const recommendations = result.records
                .map(toRecommendation)
                .sort((a, b) => b.score - a.score);
            return dedupeByTypeAndName(recommendations).slice(
                0,
                MAX_RECOMMENDATIONS,
            );
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
        createdBy?: string,
    ): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    await session.run(
                        `MERGE (s:Service {id: $serviceId})
         ON CREATE SET s.name = $name, s.createdBy = $createdBy, s.createdAt = datetime()
         ON MATCH SET s.name = $name, s.createdBy = coalesce($createdBy, s.createdBy), s.updatedAt = datetime()`,
                        { serviceId, name, createdBy: createdBy ?? null },
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
        participation: EventParticipation,
    ): Promise<{ success: boolean }> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    const relation =
                        resolveParticipationRelation(participation);
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

    async recordHelpRendered(help: HelpRendered): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    await session.run(
                        `MERGE (payer:User {id: $payerId})
         MERGE (payee:User {id: $payeeId})
         MERGE (payer)-[h:HELPED {serviceId: $serviceId}]->(payee)
         ON CREATE SET h.points = $points, h.timestamp = datetime()`,
                        {
                            payerId: help.payerId,
                            payeeId: help.payeeId,
                            serviceId: help.serviceId,
                            points: help.points,
                        },
                    );
                } finally {
                    await session.close();
                }
            });
        } catch (error) {
            this.logger.warn(
                `Neo4j recordHelpRendered failed after retries: ${error}`,
            );
        }
    }

    async syncEvent(
        eventId: string,
        name: string,
        date: Date,
        neighborhoodId?: string,
        createdBy?: string,
    ): Promise<void> {
        try {
            await this.withRetry(async () => {
                const session = this.driver.session();
                try {
                    await session.run(
                        `MERGE (e:Event {id: $eventId})
         ON CREATE SET e.name = $name, e.date = datetime($date), e.createdBy = $createdBy, e.createdAt = datetime()
         ON MATCH SET e.name = $name, e.date = datetime($date), e.createdBy = coalesce($createdBy, e.createdBy), e.updatedAt = datetime()`,
                        {
                            eventId,
                            name,
                            date: date.toISOString(),
                            createdBy: createdBy ?? null,
                        },
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
