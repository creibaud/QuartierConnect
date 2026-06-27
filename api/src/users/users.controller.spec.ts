import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { UsersController } from "./users.controller";

const mockUser = {
    id: "user-uuid-1",
    email: "alice@demo.fr",
    role: "resident",
    createdAt: new Date(),
};

describe("UsersController", () => {
    let controller: UsersController;
    let mockDb: any;

    beforeEach(async () => {
        mockDb = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            offset: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockUser]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([mockUser]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [{ provide: DRIZZLE_TOKEN, useValue: mockDb }],
        }).compile();

        controller = module.get<UsersController>(UsersController);
    });

    it("GET /users returns paginated list", async () => {
        const result = await controller.findAll();
        expect(result).toHaveLength(1);
        expect(mockDb.select).toHaveBeenCalled();
    });

    it("PATCH /users/:id/role updates user role", async () => {
        mockDb.returning.mockResolvedValue([
            { ...mockUser, role: "moderator" },
        ]);
        const result = await controller.updateRole("user-uuid-1", {
            role: "moderator",
        });
        expect(result.role).toBe("moderator");
    });

    it("PATCH /users/:id/role throws 404 for unknown user", async () => {
        mockDb.returning.mockResolvedValue([]);
        await expect(
            controller.updateRole("bad-id", { role: "admin" }),
        ).rejects.toThrow(NotFoundException);
    });

    const authReq = (sub = "user-uuid-1"): { user: { sub: string } } => ({
        user: { sub },
    });

    it("GET /users/search returns email matches capped at 10", async () => {
        const result = await controller.searchByEmail("bob", authReq());
        expect(result).toEqual([mockUser]);
        expect(mockDb.limit).toHaveBeenCalledWith(10);
    });

    it("GET /users/search returns empty list when query is too short", async () => {
        const result = await controller.searchByEmail("a", authReq());
        expect(result).toEqual([]);
        expect(mockDb.where).not.toHaveBeenCalled();
    });

    it("GET /users/search trims whitespace before measuring length", async () => {
        const result = await controller.searchByEmail("  b  ", authReq());
        expect(result).toEqual([]);
        expect(mockDb.where).not.toHaveBeenCalled();
    });
});
