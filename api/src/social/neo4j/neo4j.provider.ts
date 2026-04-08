import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import neo4j, { Driver } from "neo4j-driver";

export const NEO4J_DRIVER = "NEO4J_DRIVER";

export const Neo4jProvider: Provider = {
    provide: NEO4J_DRIVER,
    inject: [ConfigService],
    useFactory: (config: ConfigService): Driver =>
        neo4j.driver(
            config.get<string>("NEO4J_URI", "bolt://localhost:7687"),
            neo4j.auth.basic(
                config.get<string>("NEO4J_USER", "neo4j"),
                config.get<string>("NEO4J_PASSWORD") ?? "",
            ),
        ),
};
