import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { UsersController } from "./users.controller";

const mockUser = {
    id: "user-uuid-1",
    email: "alice@demo.fr",
    role: "resident",
    createdAt: new Date(),
};

// Minimal Response stub: findAll only touches setHeader for the count headers.
const mockRes = () => ({ setHeader: jest.fn() }) as any;

describe("UsersController", () => {
    let controller: UsersController;
    let mockDb: any;

    beforeEach(async () => {
        // Only where()'s result is thenable; a thenable db mock would break Nest DI.
        const roleLookup = jest.fn(() =>
            Promise.resolve<unknown[]>([mockUser]),
        );
        mockDb = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            offset: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockUser]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([mockUser]),
            roleLookup,
            where: jest.fn(),
        };
        // Chainable builder that's also thenable for the direct role lookup.
        const whereBuilder = {
            orderBy: mockDb.orderBy,
            offset: mockDb.offset,
            limit: mockDb.limit,
            returning: mockDb.returning,
            then: (
                resolve: (rows: unknown[]) => unknown,
                reject: (err: unknown) => unknown,
            ) => roleLookup().then(resolve, reject),
        };
        mockDb.where.mockReturnValue(whereBuilder);

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [{ provide: DRIZZLE_TOKEN, useValue: mockDb }],
        }).compile();

        controller = module.get<UsersController>(UsersController);
    });

    it("GET /users returns paginated list", async () => {
        const result = await controller.findAll(mockRes());
        expect(result).toHaveLength(1);
        expect(mockDb.select).toHaveBeenCalled();
    });

    it("GET /users without filters queries with an undefined where clause", async () => {
        await controller.findAll(mockRes());
        expect(mockDb.where).toHaveBeenCalledWith(undefined);
    });

    it("GET /users?search filters server-side instead of relying on loaded pages", async () => {
        await controller.findAll(mockRes(), "1", "20", "bob", "resident");
        expect(mockDb.where).toHaveBeenCalled();
        expect(mockDb.where.mock.calls[0][0]).toBeDefined();
    });

    it("GET /users ignores an unknown role filter", async () => {
        await controller.findAll(mockRes(), "1", "20", "", "superadmin");
        expect(mockDb.where).toHaveBeenCalledWith(undefined);
    });

    const authReq = (sub = "user-uuid-1"): { user: { sub: string } } => ({
        user: { sub },
    });

    it("PATCH /users/:id/role updates user role", async () => {
        mockDb.returning.mockResolvedValue([
            { ...mockUser, role: "moderator" },
        ]);
        const result = await controller.updateRole(
            "user-uuid-1",
            { role: "moderator" },
            authReq("admin-uuid"),
        );
        expect(result.role).toBe("moderator");
    });

    it("PATCH /users/:id/role throws 404 for unknown user", async () => {
        mockDb.roleLookup.mockResolvedValue([]);
        await expect(
            controller.updateRole(
                "bad-id",
                { role: "admin" },
                authReq("admin-uuid"),
            ),
        ).rejects.toThrow(NotFoundException);
    });

    it("PATCH /users/:id/role forbids an admin from changing their own role", async () => {
        await expect(
            controller.updateRole(
                "admin-uuid",
                { role: "resident" },
                authReq("admin-uuid"),
            ),
        ).rejects.toThrow(ForbiddenException);
        expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("PATCH /users/:id/role forbids an admin from banning themselves", async () => {
        await expect(
            controller.updateRole(
                "admin-uuid",
                { role: "banned" },
                authReq("admin-uuid"),
            ),
        ).rejects.toThrow(ForbiddenException);
        expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("PATCH /users/:id/role restores the pre-ban role when reactivating", async () => {
        mockDb.roleLookup.mockResolvedValue([
            { role: "banned", previousRole: "moderator" },
        ]);
        mockDb.returning.mockResolvedValue([
            { ...mockUser, role: "moderator" },
        ]);
        await controller.updateRole(
            "user-uuid-1",
            { role: "resident" },
            authReq("admin-uuid"),
        );
        expect(mockDb.set).toHaveBeenCalledWith(
            expect.objectContaining({ role: "moderator", previousRole: null }),
        );
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

    const neighborReq = (
        neighborhoodId: string | null = "nb-1",
    ): { user: { sub: string; neighborhoodId: string | null } } => ({
        user: { sub: "user-uuid-1", neighborhoodId },
    });

    it("GET /users/neighbors returns empty list when caller has no neighborhood", async () => {
        const result = await controller.findNeighbors("", neighborReq(null));
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("GET /users/neighbors maps rows to id and display name capped at 20", async () => {
        mockDb.limit.mockResolvedValue([
            { id: "user-uuid-2", firstName: "Bob", lastName: "Durand" },
        ]);
        const result = await controller.findNeighbors("", neighborReq());
        expect(result).toEqual([{ id: "user-uuid-2", name: "Bob Durand" }]);
        expect(mockDb.limit).toHaveBeenCalledWith(20);
    });

    it("GET /users/neighbors falls back to a generic name when names are missing", async () => {
        mockDb.limit.mockResolvedValue([
            { id: "user-uuid-3", firstName: null, lastName: null },
        ]);
        const result = await controller.findNeighbors("bob", neighborReq());
        expect(result).toEqual([{ id: "user-uuid-3", name: "Voisin" }]);
    });
});
