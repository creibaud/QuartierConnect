import { Driver } from "neo4j-driver";

export async function syncLivesIn(
    driver: Driver,
    userId: string,
    neighborhoodId: string,
): Promise<void> {
    let session: ReturnType<Driver["session"]> | undefined;
    try {
        session = driver.session();
        await session.run(
            `MATCH (u:User {id: $userId})
             MATCH (n:Neighborhood {id: $neighborhoodId})
             MERGE (u)-[:LIVES_IN]->(n)`,
            { userId, neighborhoodId },
        );
    } catch {
        // Neo4j unavailable — Postgres assignment remains valid
    } finally {
        await session?.close();
    }
}
