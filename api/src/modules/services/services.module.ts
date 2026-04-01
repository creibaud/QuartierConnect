import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/database/drizzle/drizzle.module";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { MongodbModule } from "src/database/mongodb/mongodb.module";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { OutboxModule } from "src/modules/outbox/outbox.module";
import {
    ServicesRepository,
    type IServicesRepository,
} from "src/modules/services/service.repository";
import { ServicesController } from "src/modules/services/services.controller";
import { ServicesService } from "src/modules/services/services.service";

@Module({
    imports: [MongodbModule, DrizzleModule, OutboxModule],
    controllers: [ServicesController],
    providers: [
        {
            provide: "IServicesRepository",
            useFactory: (
                mongo: MongoDatabase,
                db: DrizzleDB,
            ): IServicesRepository => new ServicesRepository(mongo, db),
            inject: ["MONGODB", "DRIZZLE"],
        },
        ServicesService,
    ],
    exports: [ServicesService],
})
export class ServicesModule {}
