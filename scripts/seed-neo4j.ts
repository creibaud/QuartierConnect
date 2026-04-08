/**
 * Seed Neo4j graph with existing MongoDB/PostgreSQL data.
 * Run: npx ts-node scripts/seed-neo4j.ts
 *
 * Requires: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, MONGO_URI, DATABASE_URL
 */
import neo4j from 'neo4j-driver';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const NEO4J_URI = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER ?? 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? '';
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/quartierconnect';

async function main() {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  );

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const session = driver.session();

  try {
    // Seed Neighborhoods
    const neighborhoods = await mongoose.connection
      .collection('neighborhoods')
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
      .collection('services')
      .find({})
      .toArray();

    for (const svc of services) {
      await session.run(
        `MERGE (s:Service {id: $id})
         ON CREATE SET s.name = $name, s.category = $category, s.createdAt = datetime()
         ON MATCH SET s.name = $name, s.category = $category, s.updatedAt = datetime()`,
        {
          id: svc._id.toString(),
          name: (svc.title ?? svc.name ?? '') as string,
          category: (svc.category ?? '') as string,
        },
      );

      if (svc.neighborhoodId) {
        await session.run(
          `MATCH (s:Service {id: $serviceId})
           MERGE (n:Neighborhood {id: $neighborhoodId})
           MERGE (s)-[:LOCATED_IN]->(n)`,
          { serviceId: svc._id.toString(), neighborhoodId: String(svc.neighborhoodId) },
        );
      }
    }
    console.log(`Seeded ${services.length} services`);

    // Seed Events
    const events = await mongoose.connection
      .collection('events')
      .find({})
      .toArray();

    for (const evt of events) {
      const dateStr = evt.date
        ? new Date(evt.date as Date).toISOString()
        : new Date().toISOString();

      await session.run(
        `MERGE (e:Event {id: $id})
         ON CREATE SET e.name = $name, e.date = datetime($date), e.createdAt = datetime()
         ON MATCH SET e.name = $name, e.date = datetime($date), e.updatedAt = datetime()`,
        { id: evt._id.toString(), name: evt.title as string, date: dateStr },
      );

      if (evt.neighborhoodId) {
        await session.run(
          `MATCH (e:Event {id: $eventId})
           MERGE (n:Neighborhood {id: $neighborhoodId})
           MERGE (e)-[:HELD_IN]->(n)`,
          { eventId: evt._id.toString(), neighborhoodId: String(evt.neighborhoodId) },
        );
      }
    }
    console.log(`Seeded ${events.length} events`);

    console.log('Neo4j seed completed successfully');
  } finally {
    await session.close();
    await driver.close();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
