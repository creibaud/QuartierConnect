import { ConfigService } from "@nestjs/config";
import neo4j from "neo4j-driver";
import { NeoNodeLabel } from "./models/node-labels";

export const Neo4jProvider = {
    provide: "NEO4J",
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
        const host = configService.getOrThrow<string>("NEO4J_HOST");
        const port = configService.getOrThrow<number>("NEO4J_PORT");
        const user = configService.getOrThrow<string>("NEO4J_USER");
        const password = configService.getOrThrow<string>("NEO4J_PASSWORD");

        const driver = neo4j.driver(
            `bolt://${host}:${port}`,
            neo4j.auth.basic(user, password),
        );

        const session = driver.session();

        try {
            await session.run(
                `CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:${NeoNodeLabel.User}) REQUIRE u.id IS UNIQUE`,
            );
            await session.run(
                `CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (e:${NeoNodeLabel.Event}) REQUIRE e.id IS UNIQUE`,
            );
            await session.run(
                `CREATE CONSTRAINT service_id_unique IF NOT EXISTS FOR (s:${NeoNodeLabel.Service}) REQUIRE s.id IS UNIQUE`,
            );
        } finally {
            await session.close();
        }

        return driver;
    },
};
