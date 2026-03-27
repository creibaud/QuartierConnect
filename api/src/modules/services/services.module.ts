import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/database/drizzle/drizzle.module";
import { MongodbModule } from "src/database/mongodb/mongodb.module";
import { ServicesController } from "src/modules/services/services.controller";
import { ServicesService } from "src/modules/services/services.service";

@Module({
    imports: [MongodbModule, DrizzleModule],
    controllers: [ServicesController],
    providers: [ServicesService],
    exports: [ServicesService],
})
export class ServicesModule {}
