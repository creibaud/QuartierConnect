import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/database/drizzle/schema/index.ts",
    out: "./src/database/drizzle/migrations",
    dialect: "postgresql",
    dbCredentials: {
        host: process.env.POSTGRES_DB_HOST!,
        port: Number(process.env.POSTGRES_DB_PORT),
        user: process.env.POSTGRES_DB_USER!,
        password: process.env.POSTGRES_DB_PASSWORD!,
        database: process.env.POSTGRES_DB_NAME!,
        ssl: false,
    },
});
