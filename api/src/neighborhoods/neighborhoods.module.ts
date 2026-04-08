import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { SocialModule } from "../social/social.module";
import { NeighborhoodsController } from "./neighborhoods.controller";
import { NeighborhoodsService } from "./neighborhoods.service";
import {
    Neighborhood,
    NeighborhoodSchema,
} from "./schemas/neighborhood.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Neighborhood.name, schema: NeighborhoodSchema },
        ]),
        AuthModule,
        SocialModule,
    ],
    controllers: [NeighborhoodsController],
    providers: [NeighborhoodsService],
    exports: [NeighborhoodsService],
})
export class NeighborhoodsModule {}
