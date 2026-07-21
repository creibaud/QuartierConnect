import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IncidentsController } from "./incidents.controller";
import { IncidentsService } from "./incidents.service";

@Module({
    imports: [AuthModule],
    controllers: [IncidentsController],
    providers: [IncidentsService],
    exports: [IncidentsService],
})
export class IncidentsModule {}
