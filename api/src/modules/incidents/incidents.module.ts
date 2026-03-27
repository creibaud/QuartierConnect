import { Module } from "@nestjs/common";
import { IncidentsController } from "src/modules/incidents/incidents.controller";
import { IncidentsService } from "src/modules/incidents/incidents.service";

@Module({
    controllers: [IncidentsController],
    providers: [IncidentsService],
    exports: [IncidentsService],
})
export class IncidentsModule {}
