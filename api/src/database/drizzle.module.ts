import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const DRIZZLE_TOKEN = "DRIZZLE";

@Global()
@Module({
    providers: [
        {
            provide: DRIZZLE_TOKEN,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const connectionString =
                    config.get<string>("POSTGRES_URL") ??
                    config.get<string>("DATABASE_URL") ??
                    "postgresql://postgres:postgres@localhost:5432/quartierconnect";
                const client = postgres(connectionString);
                return drizzle(client, { schema });
            },
        },
    ],
    exports: [DRIZZLE_TOKEN],
})
export class DrizzleModule {}
