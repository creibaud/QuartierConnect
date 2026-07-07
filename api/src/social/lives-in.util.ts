import { Driver } from "neo4j-driver";

// A user lives in exactly one neighborhood: drop any previous LIVES_IN before merging.
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
             OPTIONAL MATCH (u)-[old:LIVES_IN]->(other:Neighborhood)
             WHERE other <> n
             DELETE old
             MERGE (u)-[:LIVES_IN]->(n)`,
            { userId, neighborhoodId },
        );
    } catch {
        // Neo4j unavailable — Postgres assignment remains valid
    } finally {
        await session?.close();
    }
}

// Address became uncovered: drop the stale LIVES_IN to match the nulled assignment.
export async function clearLivesIn(
    driver: Driver,
    userId: string,
): Promise<void> {
    let session: ReturnType<Driver["session"]> | undefined;
    try {
        session = driver.session();
        await session.run(
            `MATCH (:User {id: $userId})-[old:LIVES_IN]->()
             DELETE old`,
            { userId },
        );
    } catch {
        // Neo4j unavailable — Postgres remains the source of truth
    } finally {
        await session?.close();
    }
}
