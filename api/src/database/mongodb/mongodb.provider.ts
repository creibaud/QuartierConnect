import { ConfigService } from "@nestjs/config";
import { MongoClient } from "mongodb";

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

        return client.db(db);
    },
};
