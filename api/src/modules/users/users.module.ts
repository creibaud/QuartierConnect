import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/database/drizzle/drizzle.module";
import { UserService } from "src/modules/users/user.service";
import { UsersController } from "src/modules/users/users.controller";

@Module({
    imports: [DrizzleModule],
    controllers: [UsersController],
    providers: [UserService],
    exports: [UserService],
})
export class UsersModule {}
