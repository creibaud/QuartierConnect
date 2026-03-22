import { Global, Module } from "@nestjs/common";
import { DrizzleProvider } from "src/database/drizzle/drizzle.provider";

@Global()
@Module({
    providers: [DrizzleProvider],
    exports: [DrizzleProvider],
})
export class DrizzleModule {}
