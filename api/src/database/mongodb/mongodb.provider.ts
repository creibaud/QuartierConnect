import { ConfigService } from "@nestjs/config";
import { MongoClient } from "mongodb";
import { QUARTIERS_GEO_COLLECTION } from "./models/quartier-geo.model";

export const MongodbProvider = {
    provide: "MONGODB",
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
        const host = configService.getOrThrow<string>("MONGO_HOST");
        const port = configService.getOrThrow<number>("MONGO_PORT");
        const user = configService.getOrThrow<string>("MONGO_USER");
        const password = configService.getOrThrow<string>("MONGO_PASSWORD");
        const db = configService.getOrThrow<string>("MONGO_DB");

        const uri = `mongodb://${user}:${password}@${host}:${port}/${db}?authSource=admin`;
        const client = new MongoClient(uri);

        await client.connect();

        const database = client.db(db);

        await database
            .collection(QUARTIERS_GEO_COLLECTION)
            .createIndex(
                { geojson: "2dsphere" },
                { name: "quartiers_geo_geojson_2dsphere" },
            );

        return database;
    },
};
