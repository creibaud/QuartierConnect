import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { CommunityVotesController } from "./community-votes.controller";
import { CommunityVotesService } from "./community-votes.service";
import {
    CommunityVote,
    CommunityVoteSchema,
} from "./schemas/community-vote.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: CommunityVote.name, schema: CommunityVoteSchema },
        ]),
        AuthModule,
    ],
    controllers: [CommunityVotesController],
    providers: [CommunityVotesService],
    exports: [CommunityVotesService],
})
export class CommunityVotesModule {}
