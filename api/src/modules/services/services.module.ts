import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/database/drizzle/drizzle.module";
import { MongodbModule } from "src/database/mongodb/mongodb.module";
import { Neo4jModule } from "src/database/neo4j/neo4j.module";
import { ServicesController } from "src/modules/services/services.controller";
import { ServicesService } from "src/modules/services/services.service";

@Module({
    imports: [MongodbModule, Neo4jModule, DrizzleModule],
    controllers: [ServicesController],
    providers: [ServicesService],
    exports: [ServicesService],
})
export class ServicesModule {}
