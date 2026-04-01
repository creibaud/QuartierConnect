import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/database/drizzle/drizzle.module";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { MongodbModule } from "src/database/mongodb/mongodb.module";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { AdminController } from "src/modules/admin/admin.controller";
import { AdminService } from "src/modules/admin/admin.service";
import {
    AdminEventStatsRepository,
    AdminGlobalRepository,
    AdminMessageVoteStatsRepository,
    AdminPointConfigRepository,
    AdminServiceStatsRepository,
} from "src/modules/admin/repositories";

@Module({
    imports: [DrizzleModule, MongodbModule],
    controllers: [AdminController],
    providers: [
        {
            provide: AdminGlobalRepository,
            useFactory: (db: DrizzleDB, mongo: MongoDatabase) =>
                new AdminGlobalRepository(db, mongo),
            inject: ["DRIZZLE", "MONGODB"],
        },
        {
            provide: AdminPointConfigRepository,
            useFactory: (db: DrizzleDB) => new AdminPointConfigRepository(db),
            inject: ["DRIZZLE"],
        },
        {
            provide: AdminEventStatsRepository,
            useFactory: (mongo: MongoDatabase) =>
                new AdminEventStatsRepository(mongo),
            inject: ["MONGODB"],
        },
        {
            provide: AdminServiceStatsRepository,
            useFactory: (mongo: MongoDatabase) =>
                new AdminServiceStatsRepository(mongo),
            inject: ["MONGODB"],
        },
        {
            provide: AdminMessageVoteStatsRepository,
            useFactory: (mongo: MongoDatabase) =>
                new AdminMessageVoteStatsRepository(mongo),
            inject: ["MONGODB"],
        },
        AdminService,
    ],
    exports: [AdminService],
})
export class AdminModule {}
