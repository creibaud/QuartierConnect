import { Module } from "@nestjs/common";
import { QuartiersController } from "src/modules/quartiers/quartiers.controller";
import { QuartiersService } from "src/modules/quartiers/quartiers.service";
import { GeoService } from "src/modules/quartiers/services";

@Module({
    controllers: [QuartiersController],
    providers: [
        {
            provide: GeoService,
            useFactory: (mongo) => new GeoService(mongo),
            inject: ["MONGODB"],
        },
        QuartiersService,
    ],
    exports: [QuartiersService, GeoService],
})
export class QuartiersModule {}
