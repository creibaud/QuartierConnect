import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { User, UserSchema } from "../auth/schemas/user.schema";
import {
    ServiceBooking,
    ServiceBookingSchema,
} from "../bookings/schemas/service-booking.schema";
import {
    CommunityVote,
    CommunityVoteSchema,
} from "../community-votes/schemas/community-vote.schema";
import { Contract, ContractSchema } from "../contracts/schemas/contract.schema";
import { GeocodingModule } from "../geocoding/geocoding.module";
import { Message, MessageSchema } from "../messaging/schemas/message.schema";
import { NeighborhoodsModule } from "../neighborhoods/neighborhoods.module";
import { Service, ServiceSchema } from "../services/schemas/service.schema";
import { Neo4jModule } from "../social/neo4j/neo4j.module";
import { Vote, VoteSchema } from "../votes/schemas/vote.schema";
import { AddressController } from "./address.controller";
import { GdprExportService } from "./gdpr-export.service";
import { MeController } from "./me.controller";
import { UsersAvatarController } from "./users-avatar.controller";
import { UsersController } from "./users.controller";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Message.name, schema: MessageSchema },
            { name: Contract.name, schema: ContractSchema },
            { name: ServiceBooking.name, schema: ServiceBookingSchema },
            { name: Vote.name, schema: VoteSchema },
            { name: CommunityVote.name, schema: CommunityVoteSchema },
            { name: Service.name, schema: ServiceSchema },
        ]),
        AuthModule,
        Neo4jModule,
        GeocodingModule,
        NeighborhoodsModule,
    ],
    controllers: [
        UsersController,
        MeController,
        UsersAvatarController,
        AddressController,
    ],
    providers: [GdprExportService],
})
export class UsersModule {}
