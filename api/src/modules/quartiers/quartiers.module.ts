import { Module } from "@nestjs/common";
import { QuartiersController } from "src/modules/quartiers/quartiers.controller";
import { QuartiersService } from "src/modules/quartiers/quartiers.service";

@Module({
    controllers: [QuartiersController],
    providers: [QuartiersService],
    exports: [QuartiersService],
})
export class QuartiersModule {}
