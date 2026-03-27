import { Global, Module } from "@nestjs/common";
import { Neo4jSyncService } from "src/database/neo4j/neo4j-sync.service";
import { Neo4jProvider } from "src/database/neo4j/neo4j.provider";

@Global()
@Module({
    providers: [Neo4jProvider, Neo4jSyncService],
    exports: [Neo4jProvider, Neo4jSyncService],
})
export class Neo4jModule {}
