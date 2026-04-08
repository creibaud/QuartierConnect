import { Global, Module } from "@nestjs/common";
import { Neo4jProvider } from "./neo4j.provider";

@Global()
@Module({
    providers: [Neo4jProvider],
    exports: [Neo4jProvider],
})
export class Neo4jModule {}
