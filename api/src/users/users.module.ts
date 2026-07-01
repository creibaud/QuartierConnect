import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { User, UserSchema } from "../auth/schemas/user.schema";
import { GeocodingModule } from "../geocoding/geocoding.module";
import { NeighborhoodsModule } from "../neighborhoods/neighborhoods.module";
import { Neo4jModule } from "../social/neo4j/neo4j.module";
import { AddressController } from "./address.controller";
import { MeController } from "./me.controller";
import { UsersAvatarController } from "./users-avatar.controller";
import { UsersController } from "./users.controller";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
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
})
export class UsersModule {}
