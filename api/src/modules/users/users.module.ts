import { Module } from "@nestjs/common";
import { UserService } from "src/modules/users/user.service";
import { UsersController } from "src/modules/users/users.controller";

@Module({
    controllers: [UsersController],
    providers: [UserService],
    exports: [UserService],
})
export class UsersModule {}
