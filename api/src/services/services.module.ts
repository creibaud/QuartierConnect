import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { SocialModule } from "../social/social.module";
import {
    ServiceResponse,
    ServiceResponseSchema,
} from "./schemas/service-response.schema";
import { Service, ServiceSchema } from "./schemas/service.schema";
import { ServicesController } from "./services.controller";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Service.name, schema: ServiceSchema },
            { name: ServiceResponse.name, schema: ServiceResponseSchema },
        ]),
        AuthModule,
        SocialModule,
    ],
    controllers: [ServicesController],
})
export class ServicesModule {}
