import { Module } from "@nestjs/common";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { QuartiersRepository } from "src/modules/quartiers/quartier.repository";
import { QuartiersController } from "src/modules/quartiers/quartiers.controller";
import { QuartiersService } from "src/modules/quartiers/quartiers.service";
import { GeoService } from "src/modules/quartiers/services";

@Module({
    controllers: [QuartiersController],
    providers: [
        {
            provide: "IQuartiersRepository",
            useFactory: (db: DrizzleDB) => new QuartiersRepository(db),
            inject: ["DRIZZLE"],
        },
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
