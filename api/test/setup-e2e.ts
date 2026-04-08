import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// Point pythonia at the uv venv Python so PLY (and other dsl deps) are available.
const venvPython = resolve(__dirname, "../../dsl/.venv/bin/python3");
if (existsSync(venvPython)) {
    process.env.PYTHON_BIN = venvPython;
}

// Tell DslService where to find the Python DSL module.
if (!process.env.DSL_PATH) {
    process.env.DSL_PATH = resolve(__dirname, "../../dsl");
}

// Load root .env to get MongoDB credentials
try {
    const envFile = readFileSync(resolve(__dirname, "../../.env"), "utf-8");
    for (const line of envFile.split("\n")) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
} catch {
    // .env not found — env vars must be set externally
}

// Override MONGO_URI to use a dedicated E2E database.
// Use credentials from the root .env so auth is satisfied.
const user = process.env.MONGO_ROOT_USER ?? "root";
const pass = process.env.MONGO_ROOT_PASSWORD ?? "";
process.env.MONGO_URI = pass
    ? `mongodb://${user}:${pass}@localhost:27017/quartierconnect_e2e?authSource=admin`
    : `mongodb://localhost:27017/quartierconnect_e2e`;

// E2E tests verify rate-limiting behaviour — force a tight limit regardless of .env.
process.env.LOGIN_RATE_LIMIT = "5";

// Map POSTGRES_URL → DATABASE_URL used by DrizzleModule.
// Prefer an explicitly set DATABASE_URL; fall back to POSTGRES_URL from .env.
if (!process.env.DATABASE_URL) {
    if (process.env.POSTGRES_URL) {
        process.env.DATABASE_URL = process.env.POSTGRES_URL;
    } else if (process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD) {
        const pgHost = process.env.POSTGRES_HOST ?? "localhost";
        const pgPort = process.env.POSTGRES_PORT ?? "5432";
        const pgDb = process.env.POSTGRES_DB ?? "quartierconnect";
        process.env.DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${pgHost}:${pgPort}/${pgDb}`;
    }
}
