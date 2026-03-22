import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const DrizzleProvider = {
    provide: "DRIZZLE",
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
        const pool = new Pool({
            host: configService.get<string>("POSTGRES_DB_HOST"),
            port: configService.get<number>("POSTGRES_DB_PORT"),
            user: configService.get<string>("POSTGRES_DB_USER"),
            password: configService.get<string>("POSTGRES_DB_PASSWORD"),
            database: configService.get<string>("POSTGRES_DB_NAME"),
        });
        return drizzle(pool, { schema });
    },
};
