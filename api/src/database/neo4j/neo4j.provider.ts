import { ConfigService } from "@nestjs/config";
import neo4j from "neo4j-driver";

export const Neo4jProvider = {
    provide: "NEO4J",
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
        const host = configService.getOrThrow<string>("NEO4J_HOST");
        const port = configService.getOrThrow<number>("NEO4J_PORT");
        const user = configService.getOrThrow<string>("NEO4J_USER");
        const password = configService.getOrThrow<string>("NEO4J_PASSWORD");

        return neo4j.driver(
            `bolt://${host}:${port}`,
            neo4j.auth.basic(user, password),
        );
    },
};
