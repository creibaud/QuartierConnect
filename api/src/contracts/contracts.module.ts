import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { DrizzleModule } from "../database/drizzle.module";
import { DocumentsModule } from "../documents/documents.module";
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
        DocumentsModule,
    ],
    controllers: [ContractsController],
    providers: [ContractsService],
    exports: [ContractsService],
})
export class ContractsModule {}
