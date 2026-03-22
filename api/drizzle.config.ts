import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/database/drizzle/schema/index.ts",
    out: "./src/database/drizzle/migrations",
    dialect: "postgresql",
    dbCredentials: {
        host: process.env.POSTGRES_HOST!,
        port: Number(process.env.POSTGRES_PORT),
        user: process.env.POSTGRES_USER!,
        password: process.env.POSTGRES_PASSWORD!,
        database: process.env.POSTGRES_DB!,
        ssl: false,
    },
});
