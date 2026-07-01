import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { TotpService } from "../auth/totp.service";
import { DrizzleModule } from "../database/drizzle.module";
import { PointsModule } from "../points/points.module";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { Contract, ContractSchema } from "./schemas/contract.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Contract.name, schema: ContractSchema },
        ]),
        DrizzleModule,
        AuthModule,
        PointsModule,
    ],
    controllers: [ContractsController],
    providers: [ContractsService, TotpService],
    exports: [ContractsService],
})
export class ContractsModule {}
