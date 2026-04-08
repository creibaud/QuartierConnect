import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { DrizzleModule } from "../database/drizzle.module";
import { Event, EventSchema } from "../events/schemas/event.schema";
import {
    Neighborhood,
    NeighborhoodSchema,
} from "../neighborhoods/schemas/neighborhood.schema";
import { Service, ServiceSchema } from "../services/schemas/service.schema";
import { DslController } from "./dsl.controller";
import { DslService } from "./dsl.service";

@Module({
    imports: [
        AuthModule,
        DrizzleModule,
        MongooseModule.forFeature([
            { name: Neighborhood.name, schema: NeighborhoodSchema },
            { name: Service.name, schema: ServiceSchema },
            { name: Event.name, schema: EventSchema },
        ]),
    ],
    controllers: [DslController],
    providers: [DslService],
})
export class DslModule {}
