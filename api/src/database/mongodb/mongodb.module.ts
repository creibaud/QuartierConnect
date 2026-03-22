import { Global, Module } from "@nestjs/common";
import { MongodbProvider } from "src/database/mongodb/mongodb.provider";

@Global()
@Module({
    providers: [MongodbProvider],
    exports: [MongodbProvider],
})
export class MongodbModule {}
