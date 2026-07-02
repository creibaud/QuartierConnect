/**
 * Seed Neo4j graph with existing MongoDB/PostgreSQL data.
 * Run: npx ts-node scripts/seed-neo4j.ts
 *
 * Requires: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, MONGO_URI,
 * PG_CONTAINER/POSTGRES_USER/POSTGRES_DB (Postgres read via docker exec)
 */
import { execSync } from "child_process";
import neo4j from "neo4j-driver";
import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const NEO4J_URI = process.env.NEO4J_URI ?? "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER ?? "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? "";
const MONGO_URI =
  process.env.MONGO_URI ?? "mongodb://localhost:27017/quartierconnect";
const PG_CONTAINER = process.env.PG_CONTAINER ?? "docker-postgres-1";
const PG_USER = process.env.POSTGRES_USER ?? "qc";
const PG_DB = process.env.POSTGRES_DB ?? "quartierconnect";

const INTERESTED_EVENTS_PER_RESIDENT = 3;

interface Resident {
  id: string;
  neighborhoodId: string;
}

function pgQuery(sql: string): string {
  return execSync(
    `docker exec ${PG_CONTAINER} psql -U "${PG_USER}" -d "${PG_DB}" -t -A -c "${sql}"`,
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}

function fetchResidents(): Resident[] {
  let output: string;
  try {
    output = pgQuery(
      "SELECT id, neighborhood_id FROM users WHERE neighborhood_id IS NOT NULL",
    );
  } catch {
    console.warn(
      "Could not read users from PostgreSQL — is Docker running? Skipping LIVES_IN seed.",
    );
    return [];
  }
  if (!output) return [];
  return output.split("\n").map((line) => {
    const [id, neighborhoodId] = line.split("|").map((v) => v.trim());
    return { id, neighborhoodId };
  });
}

async function main() {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  );

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const session = driver.session();

  try {
    // Seed Neighborhoods
    const neighborhoods = await mongoose.connection
      .collection("neighborhoods")
      .find({})
      .toArray();

    for (const nbh of neighborhoods) {
      await session.run(
        `MERGE (n:Neighborhood {id: $id})
         ON CREATE SET n.name = $name, n.createdAt = datetime()
         ON MATCH SET n.name = $name, n.updatedAt = datetime()`,
        { id: nbh._id.toString(), name: nbh.name as string },
      );
    }
    console.log(`Seeded ${neighborhoods.length} neighborhoods`);

    // Seed Services
    const services = await mongoose.connection
      .collection("services")
      .find({})
      .toArray();

    for (const svc of services) {
      await session.run(
        `MERGE (s:Service {id: $id})
         ON CREATE SET s.name = $name, s.category = $category, s.createdBy = $createdBy, s.createdAt = datetime()
         ON MATCH SET s.name = $name, s.category = $category, s.createdBy = $createdBy, s.updatedAt = datetime()`,
        {
          id: svc._id.toString(),
          name: (svc.title ?? svc.name ?? "") as string,
          category: (svc.category ?? "") as string,
          createdBy: (svc.createdBy ?? null) as string | null,
        },
      );

      if (svc.neighborhoodId) {
        await session.run(
          `MATCH (s:Service {id: $serviceId})
           MERGE (n:Neighborhood {id: $neighborhoodId})
           MERGE (s)-[:LOCATED_IN]->(n)`,
          {
            serviceId: svc._id.toString(),
            neighborhoodId: String(svc.neighborhoodId),
          },
        );
      }
    }
    console.log(`Seeded ${services.length} services`);

    // Seed Events
    const events = await mongoose.connection
      .collection("events")
      .find({})
      .toArray();

    for (const evt of events) {
      const dateStr = evt.date
        ? new Date(evt.date as Date).toISOString()
        : new Date().toISOString();

      await session.run(
        `MERGE (e:Event {id: $id})
         ON CREATE SET e.name = $name, e.date = datetime($date), e.createdBy = $createdBy, e.createdAt = datetime()
         ON MATCH SET e.name = $name, e.date = datetime($date), e.createdBy = $createdBy, e.updatedAt = datetime()`,
        {
          id: evt._id.toString(),
          name: evt.title as string,
          date: dateStr,
          createdBy: (evt.createdBy ?? null) as string | null,
        },
      );

      if (evt.neighborhoodId) {
        await session.run(
          `MATCH (e:Event {id: $eventId})
           MERGE (n:Neighborhood {id: $neighborhoodId})
           MERGE (e)-[:HELD_IN]->(n)`,
          {
            eventId: evt._id.toString(),
            neighborhoodId: String(evt.neighborhoodId),
          },
        );
      }
    }
    console.log(`Seeded ${events.length} events`);

    // Seed Users + LIVES_IN
    const residents = fetchResidents();

    for (const resident of residents) {
      await session.run(
        `MERGE (u:User {id: $userId})
         ON CREATE SET u.createdAt = datetime()
         ON MATCH SET u.updatedAt = datetime()`,
        { userId: resident.id },
      );

      await session.run(
        `MERGE (n:Neighborhood {id: $neighborhoodId})
         WITH n
         MATCH (u:User {id: $userId})
         MERGE (u)-[:LIVES_IN]->(n)`,
        { userId: resident.id, neighborhoodId: resident.neighborhoodId },
      );
    }
    console.log(`Seeded ${residents.length} users with LIVES_IN`);

    // Seed INTERESTED_IN
    const interestedEvents = events.slice(0, INTERESTED_EVENTS_PER_RESIDENT);
    let interestCount = 0;

    for (const resident of residents) {
      for (const evt of interestedEvents) {
        await session.run(
          `MERGE (u:User {id: $userId})
           MERGE (e:Event {id: $eventId})
           MERGE (u)-[r:INTERESTED_IN]->(e)
           ON CREATE SET r.timestamp = datetime()`,
          { userId: resident.id, eventId: evt._id.toString() },
        );
        interestCount++;
      }
    }
    console.log(`Seeded ${interestCount} INTERESTED_IN relations`);

    console.log("Neo4j seed completed successfully");
  } finally {
    await session.close();
    await driver.close();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
