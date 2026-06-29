import { MongoClient } from "mongodb";
import neo4j from "neo4j-driver";

const DEMO_NAMES = ["Montmartre", "Marais", "Belleville", "Quartier Latin"];

async function cleanupDemo(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI environment variable is required");
    }

    const neo4jUri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
    const neo4jUser = process.env.NEO4J_USER ?? "neo4j";
    const neo4jPassword = process.env.NEO4J_PASSWORD ?? "";

    const mongo = new MongoClient(mongoUri);
    await mongo.connect();
    const db = mongo.db();

    const neighborhoodsCol = db.collection("neighborhoods");
    const servicesCol = db.collection("services");
    const eventsCol = db.collection("events");

    try {
        // Step 1: collect demo neighborhood IDs
        const demoNeighborhoods = await neighborhoodsCol
            .find(
                { name: { $in: DEMO_NAMES } },
                { projection: { _id: 1, name: 1 } },
            )
            .toArray();

        if (demoNeighborhoods.length === 0) {
            process.stdout.write(
                "No demo neighborhoods found — migration already applied (idempotent exit).\n",
            );
            return;
        }

        const demoIds = demoNeighborhoods.map((n) => n._id.toString());
        process.stdout.write(
            `Found ${demoNeighborhoods.length} demo neighborhood(s): ${demoNeighborhoods.map((n: { name: string }) => n.name).join(", ")}\n`,
        );

        // Step 2: collect service/event IDs to clean in Neo4j
        const demoServices = await servicesCol
            .find(
                { neighborhoodId: { $in: demoIds } },
                { projection: { _id: 1 } },
            )
            .toArray();
        const demoEvents = await eventsCol
            .find(
                { neighborhoodId: { $in: demoIds } },
                { projection: { _id: 1 } },
            )
            .toArray();

        const deletedServiceIds = demoServices.map((s) => s._id.toString());
        const deletedEventIds = demoEvents.map((e) => e._id.toString());

        process.stdout.write(
            `Services to delete: ${deletedServiceIds.length}\n`,
        );
        process.stdout.write(`Events to delete: ${deletedEventIds.length}\n`);

        // Step 3: backup BEFORE any delete
        process.stdout.write(
            "\n--- Backing up to _backup_8b_* collections ---\n",
        );

        const backupNeighborhoodsCol = db.collection(
            "_backup_8b_neighborhoods",
        );
        const backupServicesCol = db.collection("_backup_8b_services");
        const backupEventsCol = db.collection("_backup_8b_events");

        // Drop old backups if they exist (for idempotency on re-run)
        const existingCollections = await db
            .listCollections({
                name: {
                    $in: [
                        "_backup_8b_neighborhoods",
                        "_backup_8b_services",
                        "_backup_8b_events",
                    ],
                },
            })
            .toArray();
        for (const col of existingCollections) {
            await db.dropCollection(col.name);
            process.stdout.write(`Dropped existing backup: ${col.name}\n`);
        }

        await neighborhoodsCol
            .aggregate([
                { $match: { name: { $in: DEMO_NAMES } } },
                { $out: "_backup_8b_neighborhoods" },
            ])
            .toArray();

        const backupNbCount = await backupNeighborhoodsCol.countDocuments();
        process.stdout.write(
            `Backed up ${backupNbCount} neighborhood(s) → _backup_8b_neighborhoods\n`,
        );

        if (deletedServiceIds.length > 0) {
            await servicesCol
                .aggregate([
                    { $match: { neighborhoodId: { $in: demoIds } } },
                    { $out: "_backup_8b_services" },
                ])
                .toArray();
        } else {
            // Create empty collection for consistency
            await db.createCollection("_backup_8b_services");
        }

        const backupSvcCount = await backupServicesCol.countDocuments();
        process.stdout.write(
            `Backed up ${backupSvcCount} service(s) → _backup_8b_services\n`,
        );

        if (deletedEventIds.length > 0) {
            await eventsCol
                .aggregate([
                    { $match: { neighborhoodId: { $in: demoIds } } },
                    { $out: "_backup_8b_events" },
                ])
                .toArray();
        } else {
            await db.createCollection("_backup_8b_events");
        }

        const backupEvtCount = await backupEventsCol.countDocuments();
        process.stdout.write(
            `Backed up ${backupEvtCount} event(s) → _backup_8b_events\n`,
        );

        if (backupNbCount !== demoNeighborhoods.length) {
            throw new Error(
                `Backup count mismatch: expected ${demoNeighborhoods.length} neighborhoods, got ${backupNbCount}. Aborting.`,
            );
        }

        // Step 4: delete from Mongo
        process.stdout.write("\n--- Deleting from MongoDB ---\n");

        const svcResult = await servicesCol.deleteMany({
            neighborhoodId: { $in: demoIds },
        });
        process.stdout.write(`Deleted ${svcResult.deletedCount} service(s)\n`);

        const evtResult = await eventsCol.deleteMany({
            neighborhoodId: { $in: demoIds },
        });
        process.stdout.write(`Deleted ${evtResult.deletedCount} event(s)\n`);

        const nbResult = await neighborhoodsCol.deleteMany({
            name: { $in: DEMO_NAMES },
        });
        process.stdout.write(
            `Deleted ${nbResult.deletedCount} neighborhood(s)\n`,
        );

        // Step 5: clean Neo4j
        process.stdout.write("\n--- Cleaning Neo4j ---\n");

        const driver = neo4j.driver(
            neo4jUri,
            neo4j.auth.basic(neo4jUser, neo4jPassword),
        );
        const session = driver.session();

        try {
            const nbCleanup = await session.run(
                "MATCH (n:Neighborhood) WHERE n.name IN $names DETACH DELETE n RETURN count(n) as deleted",
                { names: DEMO_NAMES },
            );
            process.stdout.write(
                `Deleted ${nbCleanup.records[0]?.get("deleted") ?? 0} Neighborhood node(s)\n`,
            );

            if (deletedServiceIds.length > 0) {
                const svcCleanup = await session.run(
                    "MATCH (s:Service) WHERE s.id IN $ids DETACH DELETE s RETURN count(s) as deleted",
                    { ids: deletedServiceIds },
                );
                process.stdout.write(
                    `Deleted ${svcCleanup.records[0]?.get("deleted") ?? 0} Service node(s)\n`,
                );
            }

            if (deletedEventIds.length > 0) {
                const evtCleanup = await session.run(
                    "MATCH (e:Event) WHERE e.id IN $ids DETACH DELETE e RETURN count(e) as deleted",
                    { ids: deletedEventIds },
                );
                process.stdout.write(
                    `Deleted ${evtCleanup.records[0]?.get("deleted") ?? 0} Event node(s)\n`,
                );
            }
        } finally {
            await session.close();
            await driver.close();
        }

        process.stdout.write("\n--- Migration 8b complete ---\n");
    } finally {
        await mongo.close();
    }
}

cleanupDemo().catch((err) => {
    process.stderr.write(String(err) + "\n");
    process.exit(1);
});
