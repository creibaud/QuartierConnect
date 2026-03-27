import type { UUID } from "node:crypto";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { type User } from "src/database/drizzle/schema";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";
import { UserService } from "./user.service";

describe("UserService", () => {
    let service: UserService;

    const db = {
        select: jest.fn(),
        update: jest.fn(),
        insert: jest.fn(),
        delete: jest.fn(),
    } as unknown as DrizzleDB;

    const mongo = {} as unknown as MongoDatabase;

    const neo4j = {
        session: jest.fn().mockReturnValue({
            run: jest.fn().mockResolvedValue({}),
            close: jest.fn().mockResolvedValue({}),
        }),
    } as unknown as Neo4jDriver;

    const baseUser: User = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81" as UUID,
        email: "john.doe@example.com",
        password: "hashed-password",
        firstName: "John",
        lastName: "Doe",
        role: "resident",
        isActive: true,
        balance: "0.00",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const createSelectChain = <T>(result: T[]) => ({
        from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(result),
                orderBy: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        offset: jest.fn().mockResolvedValue(result),
                    }),
                }),
                groupBy: jest.fn().mockResolvedValue(result),
            }),
            orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    offset: jest.fn().mockResolvedValue(result),
                }),
            }),
        }),
    });

    beforeEach(() => {
        jest.clearAllMocks();
        service = new UserService(db, mongo, neo4j);
    });

    describe("findOne", () => {
        it("returns sanitized user when found", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([baseUser]),
            );

            const result = await service.findOne(baseUser.id as UUID);

            expect(result).not.toHaveProperty("password");
            expect(result.email).toBe(baseUser.email);
        });

        it("throws NotFoundException when user not found", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(createSelectChain([]));

            await expect(
                service.findOne("00000000-0000-0000-0000-000000000000" as UUID),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe("updateRole", () => {
        it("throws ForbiddenException when target is admin", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([{ ...baseUser, role: "admin" }]),
            );

            await expect(
                service.updateRole(baseUser.id as UUID, { role: "moderator" }),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it("updates role successfully for non-super_admin", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([baseUser]),
            );

            const updateReturning = jest
                .fn()
                .mockResolvedValue([{ ...baseUser, role: "admin" }]);
            const updateWhere = jest
                .fn()
                .mockReturnValue({ returning: updateReturning });
            const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
            (db.update as jest.Mock).mockReturnValue({ set: updateSet });

            const result = await service.updateRole(baseUser.id as UUID, {
                role: "admin",
            });

            expect(result).not.toHaveProperty("password");
            expect(result.role).toBe("admin");
        });
    });

    describe("updateStatus", () => {
        it("throws ForbiddenException when target is admin", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([{ ...baseUser, role: "admin" }]),
            );

            await expect(
                service.updateStatus(baseUser.id as UUID, { isActive: false }),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it("updates status successfully", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([baseUser]),
            );

            const updateReturning = jest
                .fn()
                .mockResolvedValue([{ ...baseUser, isActive: false }]);
            const updateWhere = jest
                .fn()
                .mockReturnValue({ returning: updateReturning });
            const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
            (db.update as jest.Mock).mockReturnValue({ set: updateSet });

            const result = await service.updateStatus(baseUser.id as UUID, {
                isActive: false,
            });

            expect(result.isActive).toBe(false);
        });
    });

    describe("findAll", () => {
        const createCountChain = (total: number) => ({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([{ count: total }]),
            }),
        });

        it("returns paginated sanitized users", async () => {
            (db.select as jest.Mock)
                .mockReturnValueOnce(createSelectChain([baseUser]))
                .mockReturnValueOnce(createCountChain(1));

            const result = await service.findAll({ page: 1, limit: 10 });

            expect(result.meta.total).toBe(1);
            expect(result.data[0]).not.toHaveProperty("password");
        });

        it("filters by role", async () => {
            (db.select as jest.Mock)
                .mockReturnValueOnce(createSelectChain([baseUser]))
                .mockReturnValueOnce(createCountChain(1));

            const result = await service.findAll({ role: "resident" });
            expect(result.data[0].role).toBe("resident");
        });

        it("returns empty when no users match", async () => {
            (db.select as jest.Mock)
                .mockReturnValueOnce(createSelectChain([]))
                .mockReturnValueOnce(createCountChain(0));

            const result = await service.findAll({ search: "unknown" });
            expect(result.data).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });
    });

    describe("getMyProfile", () => {
        it("delegates to findOne and returns sanitized user", async () => {
            (db.select as jest.Mock).mockReturnValueOnce(
                createSelectChain([baseUser]),
            );

            const result = await service.getMyProfile(baseUser.id as UUID);
            expect(result).not.toHaveProperty("password");
        });
    });

    describe("updateMyProfile", () => {
        it("throws NotFoundException when user not found", async () => {
            const updateReturning = jest.fn().mockResolvedValue([]);
            const updateWhere = jest
                .fn()
                .mockReturnValue({ returning: updateReturning });
            const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
            (db.update as jest.Mock).mockReturnValue({ set: updateSet });

            await expect(
                service.updateMyProfile(
                    "00000000-0000-0000-0000-000000000000" as UUID,
                    { firstName: "Jane" },
                ),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it("updates profile and returns sanitized user", async () => {
            const updateReturning = jest
                .fn()
                .mockResolvedValue([{ ...baseUser, firstName: "Jane" }]);
            const updateWhere = jest
                .fn()
                .mockReturnValue({ returning: updateReturning });
            const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
            (db.update as jest.Mock).mockReturnValue({ set: updateSet });

            const result = await service.updateMyProfile(baseUser.id as UUID, {
                firstName: "Jane",
            });

            expect(result.firstName).toBe("Jane");
            expect(result).not.toHaveProperty("password");
        });
    });
});
