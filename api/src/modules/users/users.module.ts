import { Module } from "@nestjs/common";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { OutboxService } from "src/modules/outbox/outbox.service";
import { UserService } from "src/modules/users/user.service";
import { UsersController } from "src/modules/users/users.controller";
import {
    UserRepository,
    type IUserRepository,
} from "src/modules/users/users.repository";

@Module({
    controllers: [UsersController],
    providers: [
        {
            provide: "IUserRepository",
            useFactory: (db: DrizzleDB) => new UserRepository(db),
            inject: ["DRIZZLE"],
        },
        {
            provide: UserService,
            useFactory: (userRepository: IUserRepository, outbox: OutboxService) =>
                new UserService(userRepository, outbox),
            inject: ["IUserRepository", OutboxService],
        },
    ],
    exports: [UserService],
})
export class UsersModule {}
