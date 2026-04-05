import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";

export interface IRecommendationsRepository {
    getRecommendations(
        userId: string,
        limit: number,
    ): Promise<{ id: string; strength: number }[]>;

    follow(userId: string, targetUserId: string): Promise<void>;

    unfollow(userId: string, targetUserId: string): Promise<void>;

    getFollowing(userId: string): Promise<string[]>;

    getFollowers(userId: string): Promise<string[]>;

    getInterestBasedRecommendations(
        userId: string,
        interests: string[],
        limit: number,
    ): Promise<{ id: string; matchScore: number }[]>;

    syncUserToGraph(userId: string, email: string, role: string): Promise<void>;

    deleteUserFromGraph(userId: string): Promise<void>;
}

/**
 * RecommendationsRepository - Neo4j abstraction for recommendations
 * Handles social graph and recommendation engine
 */
export class RecommendationsRepository implements IRecommendationsRepository {
    constructor(private readonly driver: Neo4jDriver) {}

    async getRecommendations(
        userId: string,
        limit: number = 10,
    ): Promise<{ id: string; strength: number }[]> {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (u:User { id: $userId })-[:FOLLOWS]->(friend)-[:FOLLOWS]->(recommended)
                WHERE NOT (u)-[:FOLLOWS]->(recommended)
                RETURN recommended.id, COUNT(*) as strength
                ORDER BY strength DESC
                LIMIT $limit
                `,
                { userId, limit },
            );

            return result.records.map((record) => ({
                id: record.get("recommended.id"),
                strength: record.get("strength").toNumber(),
            }));
        } finally {
            await session.close();
        }
    }

    async follow(userId: string, targetUserId: string): Promise<void> {
        const session = this.driver.session();
        try {
            await session.run(
                `
                MATCH (u:User { id: $userId })
                MATCH (target:User { id: $targetUserId })
                MERGE (u)-[:FOLLOWS]->(target)
                `,
                { userId, targetUserId },
            );
        } finally {
            await session.close();
        }
    }

    async unfollow(userId: string, targetUserId: string): Promise<void> {
        const session = this.driver.session();
        try {
            await session.run(
                `
                MATCH (u:User { id: $userId })-[r:FOLLOWS]->(target:User { id: $targetUserId })
                DELETE r
                `,
                { userId, targetUserId },
            );
        } finally {
            await session.close();
        }
    }

    async getFollowing(userId: string): Promise<string[]> {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (u:User { id: $userId })-[:FOLLOWS]->(following:User)
                RETURN following.id
                `,
                { userId },
            );

            return result.records.map((record) => record.get("following.id"));
        } finally {
            await session.close();
        }
    }

    async getFollowers(userId: string): Promise<string[]> {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (follower:User)-[:FOLLOWS]->(u:User { id: $userId })
                RETURN follower.id
                `,
                { userId },
            );

            return result.records.map((record) => record.get("follower.id"));
        } finally {
            await session.close();
        }
    }

    async getInterestBasedRecommendations(
        userId: string,
        interests: string[],
        limit: number = 10,
    ): Promise<{ id: string; matchScore: number }[]> {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (u:User { id: $userId })-[:HAS_INTEREST]->(interest:Interest)
                WHERE interest.name IN $interests
                MATCH (other:User)-[:HAS_INTEREST]->(interest)
                WHERE other.id <> $userId
                RETURN other.id, COUNT(interest) as matchScore
                ORDER BY matchScore DESC
                LIMIT $limit
                `,
                { userId, interests, limit },
            );

            return result.records.map((record) => ({
                id: record.get("other.id"),
                matchScore: record.get("matchScore").toNumber(),
            }));
        } finally {
            await session.close();
        }
    }

    async syncUserToGraph(
        userId: string,
        email: string,
        role: string,
    ): Promise<void> {
        const session = this.driver.session();
        try {
            await session.run(
                `
                MERGE (u:User { id: $userId })
                SET u.email = $email, u.role = $role, u.updatedAt = datetime()
                `,
                { userId, email, role },
            );
        } finally {
            await session.close();
        }
    }

    async deleteUserFromGraph(userId: string): Promise<void> {
        const session = this.driver.session();
        try {
            await session.run(
                `
                MATCH (u:User { id: $userId })
                DETACH DELETE u
                `,
                { userId },
            );
        } finally {
            await session.close();
        }
    }
}
