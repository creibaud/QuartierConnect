import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PointsController } from "./points.controller";
import { PointsService } from "./points.service";

@Module({
    imports: [AuthModule],
    controllers: [PointsController],
    providers: [PointsService],
    exports: [PointsService],
})
export class PointsModule {}
