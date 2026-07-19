import { execFileSync } from "child_process";
import { join } from "path";
import * as dotenv from "dotenv";

// Run from api/ (npx tsx) as well as from the repo root.
dotenv.config({ path: join(__dirname, "..", ".env"), quiet: true });

const MONGO_CONTAINER = process.env.MONGO_CONTAINER ?? "docker-mongo-1";
const MONGO_DB = process.env.MONGO_DB ?? "quartierconnect";
const MONGO_USER = process.env.MONGO_ROOT_USER ?? "root";
const MONGO_PASSWORD = process.env.MONGO_ROOT_PASSWORD ?? "";
const PG_CONTAINER = process.env.PG_CONTAINER ?? "docker-postgres-1";
const PG_USER = process.env.POSTGRES_USER ?? "qc";
const PG_DB = process.env.POSTGRES_DB ?? "quartierconnect";
const NEO4J_CONTAINER = process.env.NEO4J_CONTAINER ?? "docker-neo4j-1";
const NEO4J_USER = process.env.NEO4J_USER ?? "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? "password";

// No shell: every value is passed as a literal argv entry.
function runSilent(args: string[]): void {
  execFileSync("docker", args, { stdio: "pipe" });
}

function describe(error: unknown): string {
  const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
  return stderr || (error as Error).message;
}

function mongoEval(script: string): void {
  runSilent([
    "exec",
    MONGO_CONTAINER,
    "mongosh",
    MONGO_DB,
    "--quiet",
    "-u",
    MONGO_USER,
    "-p",
    MONGO_PASSWORD,
    "--authenticationDatabase",
    "admin",
    "--eval",
    script,
  ]);
}

// Discovered rather than listed: GridFS buckets appear on demand.
function emptyMongo(): void {
  try {
    mongoEval(
      "db.getCollectionNames().filter(n => !n.startsWith('system.')).forEach(n => db[n].deleteMany({}))",
    );
  } catch (error) {
    throw new Error(`MongoDB ${MONGO_DB}: ${describe(error)}`);
  }

  console.log("  ✓ MongoDB emptied");
}

function emptyPostgres(): void {
  // Children first, CASCADE covers whatever the order misses.
  const tables = [
    "points_transactions",
    "points_balances",
    "incidents",
    "revoked_tokens",
    "users",
  ];

  for (const table of tables) {
    try {
      runSilent([
        "exec",
        PG_CONTAINER,
        "psql",
        "-U",
        PG_USER,
        "-d",
        PG_DB,
        "-c",
        `TRUNCATE TABLE ${table} CASCADE`,
        "-q",
      ]);
    } catch (error) {
      throw new Error(`TRUNCATE ${table}: ${describe(error)}`);
    }
  }

  console.log("  ✓ PostgreSQL emptied");
}

function emptyNeo4j(): void {
  try {
    runSilent([
      "exec",
      NEO4J_CONTAINER,
      "cypher-shell",
      "-u",
      NEO4J_USER,
      "-p",
      NEO4J_PASSWORD,
      "MATCH (n) DETACH DELETE n",
    ]);
  } catch (error) {
    throw new Error(`Neo4j: ${describe(error)}`);
  }

  console.log("  ✓ Neo4j emptied");
}

function main(): void {
  console.log("QuartierConnect — Empty DB");
  console.log("Deleting all data (schemas kept)\n");

  try {
    emptyMongo();
    emptyPostgres();
    emptyNeo4j();
  } catch (error) {
    console.error(`\nFailed to empty: ${describe(error)}`);
    process.exit(1);
  }

  console.log("\nDatabases empty — ready for the jury import.");
}

main();
