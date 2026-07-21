import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { Event, EventSchema } from "../events/schemas/event.schema";
import { Service, ServiceSchema } from "../services/schemas/service.schema";
import { Vote, VoteSchema } from "./schemas/vote.schema";
import { VotesController } from "./votes.controller";
import { VotesService } from "./votes.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Vote.name, schema: VoteSchema },
            { name: Service.name, schema: ServiceSchema },
            { name: Event.name, schema: EventSchema },
        ]),
        AuthModule,
    ],
    controllers: [VotesController],
    providers: [VotesService],
})
export class VotesModule {}
