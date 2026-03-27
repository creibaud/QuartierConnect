import { Global, Module } from "@nestjs/common";
import { MongodbModule } from "src/database/mongodb/mongodb.module";
import { Neo4jModule } from "src/database/neo4j/neo4j.module";
import { OutboxAdminController } from "src/modules/outbox/outbox-admin.controller";
import { OutboxDispatcherService } from "src/modules/outbox/outbox-dispatcher.service";
import { OutboxProjectionService } from "src/modules/outbox/outbox-projection.service";
import { OutboxWorkerService } from "src/modules/outbox/outbox-worker.service";
import { OutboxService } from "src/modules/outbox/outbox.service";

@Global()
@Module({
    controllers: [OutboxAdminController],
    imports: [MongodbModule, Neo4jModule],
    providers: [
        OutboxService,
        OutboxDispatcherService,
        OutboxProjectionService,
        OutboxWorkerService,
    ],
    exports: [OutboxService, OutboxDispatcherService, OutboxProjectionService],
})
export class OutboxModule {}
