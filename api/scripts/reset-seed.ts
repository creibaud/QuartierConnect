import "dotenv/config";
import { MongoClient } from "mongodb";
import neo4j from "neo4j-driver";
import { Pool } from "pg";

function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env variable: ${name}`);
    }
    return value;
}

function assertSafeReset() {
    const forceEnabled = process.argv.includes("--force");
    if (!forceEnabled) {
        throw new Error(
            "Reset blocked. Use --force to confirm full data deletion.",
        );
    }

    const nodeEnv = process.env.NODE_ENV ?? "development";
    if (nodeEnv === "production") {
        throw new Error("Reset is disabled in production environment.");
    }
}

async function resetPostgres() {
    const pool = new Pool({
        host: getEnv("POSTGRES_HOST"),
        port: Number.parseInt(getEnv("POSTGRES_PORT"), 10),
        user: getEnv("POSTGRES_USER"),
        password: getEnv("POSTGRES_PASSWORD"),
        database: getEnv("POSTGRES_DB"),
    });

    try {
        await pool.query(`
            TRUNCATE TABLE
                incident_comments,
                incidents,
                user_quartiers,
                quartiers,
                totp_secrets,
                refresh_tokens,
                users
            RESTART IDENTITY CASCADE
        `);
    } finally {
        await pool.end();
    }
}

async function resetMongo() {
    const mongoUri = `mongodb://${getEnv("MONGO_USER")}:${getEnv("MONGO_PASSWORD")}@${getEnv("MONGO_HOST")}:${getEnv("MONGO_PORT")}/${getEnv("MONGO_DB")}?authSource=admin`;
    const client = new MongoClient(mongoUri);

    await client.connect();

    try {
        const db = client.db(getEnv("MONGO_DB"));
        await db.dropDatabase();
    } finally {
        await client.close();
    }
}

async function resetNeo4j() {
    const driver = neo4j.driver(
        `bolt://${getEnv("NEO4J_HOST")}:${getEnv("NEO4J_PORT")}`,
        neo4j.auth.basic(getEnv("NEO4J_USER"), getEnv("NEO4J_PASSWORD")),
    );

    const session = driver.session();

    try {
        await session.run("MATCH (n) DETACH DELETE n");
    } finally {
        await session.close();
        await driver.close();
    }
}

async function main() {
    assertSafeReset();

    console.log(
        "[reset-demo] Start full reset for PostgreSQL, MongoDB, Neo4j...",
    );

    await resetPostgres();
    console.log("[reset-demo] PostgreSQL reset done");

    await resetMongo();
    console.log("[reset-demo] MongoDB reset done");

    await resetNeo4j();
    console.log("[reset-demo] Neo4j reset done");

    console.log("[reset-demo] Done");
}

void main().catch((error: unknown) => {
    console.error("[reset-demo] Failed", error);
    process.exit(1);
});
