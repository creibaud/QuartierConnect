import type { UUID } from "node:crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { type User } from "src/database/drizzle/schema";
import { UserService } from "./user.service";
import { UsersController } from "./users.controller";

describe("UsersController", () => {
    let controller: UsersController;

    const userServiceMock = {
        findAll: jest.fn(),
        findOne: jest.fn(),
        getMyProfile: jest.fn(),
        updateMyProfile: jest.fn(),
        updateRole: jest.fn(),
        updateStatus: jest.fn(),
    };

    const currentUser: Omit<User, "password"> = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81" as UUID,
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "resident",
        isActive: true,
        balance: "0.00",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [{ provide: UserService, useValue: userServiceMock }],
        }).compile();

        controller = module.get<UsersController>(UsersController);
    });

    it("findAll delegates to UserService", async () => {
        const expected = {
            data: [],
            meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        };
        userServiceMock.findAll.mockResolvedValue(expected as never);

        await expect(controller.findAll({})).resolves.toEqual(expected);
        expect(userServiceMock.findAll).toHaveBeenCalledWith({});
    });

    it("findOne delegates to UserService", async () => {
        const expected = { id: currentUser.id, email: currentUser.email };
        userServiceMock.findOne.mockResolvedValue(expected as never);

        await expect(
            controller.findOne(currentUser.id as UUID),
        ).resolves.toEqual(expected);
        expect(userServiceMock.findOne).toHaveBeenCalledWith(currentUser.id);
    });

    it("getMyProfile passes current user id", async () => {
        userServiceMock.getMyProfile.mockResolvedValue(currentUser as never);

        await controller.getMyProfile(currentUser);
        expect(userServiceMock.getMyProfile).toHaveBeenCalledWith(
            currentUser.id,
        );
    });

    it("updateMyProfile passes current user id and dto", async () => {
        const dto = { firstName: "Jane" };
        userServiceMock.updateMyProfile.mockResolvedValue({
            ...currentUser,
            ...dto,
        } as never);

        await controller.updateMyProfile(currentUser, dto);
        expect(userServiceMock.updateMyProfile).toHaveBeenCalledWith(
            currentUser.id,
            dto,
        );
    });

    it("updateRole delegates to UserService", async () => {
        const dto = { role: "admin" as const };
        userServiceMock.updateRole.mockResolvedValue({
            ...currentUser,
            role: "admin",
        } as never);

        await controller.updateRole(currentUser.id as UUID, dto);
        expect(userServiceMock.updateRole).toHaveBeenCalledWith(
            currentUser.id,
            dto,
        );
    });

    it("updateStatus delegates to UserService", async () => {
        const dto = { isActive: false };
        userServiceMock.updateStatus.mockResolvedValue({
            ...currentUser,
            isActive: false,
        } as never);

        await controller.updateStatus(currentUser.id as UUID, dto);
        expect(userServiceMock.updateStatus).toHaveBeenCalledWith(
            currentUser.id,
            dto,
        );
    });
});
