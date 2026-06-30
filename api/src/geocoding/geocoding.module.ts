import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GeocodingController } from "./geocoding.controller";
import { GeocodingService } from "./geocoding.service";

@Module({
    imports: [AuthModule],
    controllers: [GeocodingController],
    providers: [GeocodingService],
    exports: [GeocodingService],
})
export class GeocodingModule {}
