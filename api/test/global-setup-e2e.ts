import { readFileSync } from "fs";
import { resolve } from "path";
import postgres from "postgres";

export default async function globalSetup() {
    // Load root .env to resolve PostgreSQL credentials
    try {
        const envFile = readFileSync(resolve(__dirname, "../../.env"), "utf-8");
        for (const line of envFile.split("\n")) {
            const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
            if (match && !process.env[match[1]])
                process.env[match[1]] = match[2];
        }
    } catch {
        // .env not found — env vars must be set externally
    }

    let dbUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!dbUrl && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD) {
        const host = process.env.POSTGRES_HOST ?? "localhost";
        const port = process.env.POSTGRES_PORT ?? "5432";
        const db = process.env.POSTGRES_DB ?? "quartierconnect";
        dbUrl = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${host}:${port}/${db}`;
    }
    dbUrl ??= "postgresql://postgres:postgres@localhost:5432/quartierconnect";

    const sql = postgres(dbUrl, { max: 1 });
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                jti text PRIMARY KEY NOT NULL,
                expires_at timestamp NOT NULL
            )
        `;
        await sql`
            CREATE INDEX IF NOT EXISTS revoked_tokens_expires_at_idx
            ON revoked_tokens USING btree (expires_at)
        `;
    } finally {
        await sql.end();
    }
}
