import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import neo4j from "neo4j-driver";
import { Pool } from "pg";
import { quartiers, userQuartiers, users } from "src/database/drizzle/schema";

function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env variable: ${name}`);
    }
    return value;
}

async function main() {
    const pool = new Pool({
        host: getEnv("POSTGRES_HOST"),
        port: Number.parseInt(getEnv("POSTGRES_PORT"), 10),
        user: getEnv("POSTGRES_USER"),
        password: getEnv("POSTGRES_PASSWORD"),
        database: getEnv("POSTGRES_DB"),
    });

    const db = drizzle(pool);

    const driver = neo4j.driver(
        `bolt://${getEnv("NEO4J_HOST")}:${getEnv("NEO4J_PORT")}`,
        neo4j.auth.basic(getEnv("NEO4J_USER"), getEnv("NEO4J_PASSWORD")),
    );

    const session = driver.session();

    try {
        const allUsers = await db
            .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                role: users.role,
                isActive: users.isActive,
                updatedAt: users.updatedAt,
            })
            .from(users);

        for (const user of allUsers) {
            await session.run(
                `MERGE (u:User {id: $id})
                 SET u.email = $email,
                     u.firstName = $firstName,
                     u.lastName = $lastName,
                     u.role = $role,
                     u.isActive = $isActive,
                     u.updatedAt = $updatedAt`,
                {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isActive: user.isActive,
                    updatedAt: (user.updatedAt ?? new Date()).toISOString(),
                },
            );
        }

        const assignments = await db
            .select({
                userId: userQuartiers.userId,
                quartierId: userQuartiers.quartierId,
                quartierName: quartiers.name,
                addedAt: userQuartiers.addedAt,
            })
            .from(userQuartiers)
            .innerJoin(quartiers, eq(userQuartiers.quartierId, quartiers.id));

        for (const assignment of assignments) {
            await session.run(
                `MERGE (q:Quartier {id: $quartierId})
                 SET q.name = $quartierName
                 MERGE (u:User {id: $userId})
                 MERGE (u)-[r:LIVES_IN]->(q)
                 ON CREATE SET r.since = $since`,
                {
                    userId: assignment.userId,
                    quartierId: assignment.quartierId,
                    quartierName: assignment.quartierName,
                    since: (assignment.addedAt ?? new Date()).toISOString(),
                },
            );
        }

        console.log(
            `[sync-neo4j-users] Synced ${allUsers.length} users and ${assignments.length} quartier links`,
        );
    } finally {
        await session.close();
        await driver.close();
        await pool.end();
    }
}

void main().catch((error: unknown) => {
    console.error("[sync-neo4j-users] Failed", error);
    process.exit(1);
});
