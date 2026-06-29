import * as fs from "fs";
import * as path from "path";
import { MongoClient, ObjectId } from "mongodb";
import neo4j from "neo4j-driver";

interface GeoJsonFeature {
    type: "Feature";
    properties: {
        l_ar: string;
        [key: string]: unknown;
    };
    geometry: {
        type: "Polygon" | "MultiPolygon";
        coordinates: number[][][] | number[][][][];
    };
}

interface GeoJsonFeatureCollection {
    type: "FeatureCollection";
    features: GeoJsonFeature[];
}

function toPolygon(feature: GeoJsonFeature): { type: "Polygon"; coordinates: number[][][] } {
    if (feature.geometry.type === "Polygon") {
        return {
            type: "Polygon",
            coordinates: feature.geometry.coordinates as number[][][],
        };
    }
    return {
        type: "Polygon",
        coordinates: (feature.geometry.coordinates as number[][][][])[0],
    };
}

async function seedParis(): Promise<void> {
    const geojsonPath = path.join(__dirname, "paris-arrondissements.geojson");
    const collection: GeoJsonFeatureCollection = JSON.parse(
        fs.readFileSync(geojsonPath, "utf-8"),
    );

    const mongoUri = process.env.MONGO_URI;
    const neo4jUri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
    const neo4jUser = process.env.NEO4J_USER ?? "neo4j";
    const neo4jPassword = process.env.NEO4J_PASSWORD ?? "";

    if (!mongoUri) {
        throw new Error("MONGO_URI environment variable is required");
    }

    const mongo = new MongoClient(mongoUri);
    await mongo.connect();
    const db = mongo.db();
    const neighborhoods = db.collection("neighborhoods");

    await neighborhoods.createIndex(
        { geometry: "2dsphere" },
        { sparse: true, background: true },
    );

    const driver = neo4j.driver(
        neo4jUri,
        neo4j.auth.basic(neo4jUser, neo4jPassword),
    );
    const session = driver.session();

    try {
        for (const feature of collection.features) {
            const name = feature.properties.l_ar;
            const geometry = toPolygon(feature);

            const result = await neighborhoods.findOneAndUpdate(
                { name },
                {
                    $set: { name, city: "Paris", geometry },
                    $setOnInsert: { _id: new ObjectId() as unknown as ObjectId },
                },
                { upsert: true, returnDocument: "after" },
            );

            const mongoId = result!._id.toString();

            await session.run(
                "MERGE (n:Neighborhood {id: $id}) SET n.name = $name",
                { id: mongoId, name },
            );

            process.stdout.write(`seeded ${name} (id=${mongoId})\n`);
        }
    } finally {
        await session.close();
        await driver.close();
        await mongo.close();
    }
}

seedParis().catch((err) => {
    process.stderr.write(String(err) + "\n");
    process.exit(1);
});
