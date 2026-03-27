import { Module } from "@nestjs/common";
import { SyncController } from "src/modules/sync/sync.controller";
import { SyncService } from "src/modules/sync/sync.service";

@Module({
    controllers: [SyncController],
    providers: [SyncService],
})
export class SyncModule {}
