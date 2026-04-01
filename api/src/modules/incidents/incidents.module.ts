import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/database/drizzle/drizzle.module";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import {
    IncidentsRepository,
    type IIncidentsRepository,
} from "src/modules/incidents/incident.repository";
import { IncidentsController } from "src/modules/incidents/incidents.controller";
import { IncidentsService } from "src/modules/incidents/incidents.service";

@Module({
    imports: [DrizzleModule],
    controllers: [IncidentsController],
    providers: [
        {
            provide: "IIncidentsRepository",
            useFactory: (db: DrizzleDB): IIncidentsRepository =>
                new IncidentsRepository(db),
            inject: ["DRIZZLE"],
        },
        IncidentsService,
    ],
    exports: [IncidentsService],
})
export class IncidentsModule {}
