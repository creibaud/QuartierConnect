import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/database/drizzle/drizzle.module";
import { MongodbModule } from "src/database/mongodb/mongodb.module";
import { TransactionsController } from "src/modules/transactions/transactions.controller";
import { TransactionsService } from "src/modules/transactions/transactions.service";

@Module({
    imports: [MongodbModule, DrizzleModule],
    controllers: [TransactionsController],
    providers: [TransactionsService],
    exports: [TransactionsService],
})
export class TransactionsModule {}
