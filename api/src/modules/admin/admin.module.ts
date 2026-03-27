import { Module } from "@nestjs/common";
import { AdminController } from "src/modules/admin/admin.controller";
import { AdminService } from "src/modules/admin/admin.service";

@Module({
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule {}
