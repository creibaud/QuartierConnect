import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IncidentsController } from "./incidents.controller";

@Module({
    imports: [AuthModule],
    controllers: [IncidentsController],
})
export class IncidentsModule {}
