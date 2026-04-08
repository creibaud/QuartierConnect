import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { User, UserSchema } from "../auth/schemas/user.schema";
import { Neo4jModule } from "../social/neo4j/neo4j.module";
import { MeController } from "./me.controller";
import { UsersController } from "./users.controller";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        AuthModule,
        Neo4jModule,
    ],
    controllers: [UsersController, MeController],
})
export class UsersModule {}
