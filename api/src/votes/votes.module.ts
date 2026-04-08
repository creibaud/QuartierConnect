import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { Vote, VoteSchema } from "./schemas/vote.schema";
import { VotesController } from "./votes.controller";
import { VotesService } from "./votes.service";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Vote.name, schema: VoteSchema }]),
        AuthModule,
    ],
    controllers: [VotesController],
    providers: [VotesService],
})
export class VotesModule {}
