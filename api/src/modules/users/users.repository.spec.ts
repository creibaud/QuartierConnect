import type { UUID } from "node:crypto";
import { randomUUID } from "node:crypto";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { UserRepository } from "src/modules/users/users.repository";

describe("UserRepository", () => {
    let repository: UserRepository;
    let mockDb: Partial<DrizzleDB>;

    const mockUser = {
        id: randomUUID() as UUID,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "resident",
        balance: "0",
        isActive: true,
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        const createSelectChain = <T>(result: T[]) => ({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue(result),
                    orderBy: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            offset: jest.fn().mockResolvedValue(result),
                        }),
                    }),
                }),
                orderBy: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        offset: jest.fn().mockResolvedValue(result),
                    }),
                }),
            }),
        });

        const createCountChain = (total: number) => ({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([{ count: total }]),
            }),
        });

        mockDb = {
            select: jest
                .fn()
                .mockImplementation(() => createSelectChain([mockUser])),
            insert: jest.fn().mockReturnValue({
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([mockUser]),
                }),
            }),
            update: jest.fn().mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([mockUser]),
                    }),
                }),
            }),
            delete: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue({ rowCount: 1 }),
            }),
        };

        repository = new UserRepository(mockDb as unknown as DrizzleDB);
    });

    describe("findOne", () => {
        it("should return user when found", async () => {
            const result = await repository.findOne(mockUser.id);

            expect(result).toEqual(mockUser);
            expect(mockDb.select).toHaveBeenCalled();
        });

        it("should return null when user not found", async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue([]),
                    }),
                }),
            });

            const result = await repository.findOne(randomUUID() as UUID);

            expect(result).toBeNull();
        });
    });

    describe("findByEmail", () => {
        it("should return user by email", async () => {
            const result = await repository.findByEmail(mockUser.email);

            expect(result).toEqual(mockUser);
        });
    });

    describe("create", () => {
        it("should create and return user", async () => {
            const userData = {
                email: "new@example.com",
                firstName: "Jane",
                lastName: "Smith",
            };

            const result = await repository.create(userData);

            expect(result).toEqual(mockUser);
            expect(mockDb.insert).toHaveBeenCalled();
        });
    });

    describe("update", () => {
        it("should update and return user", async () => {
            const updates = { firstName: "Updated" };

            const result = await repository.update(mockUser.id, updates);

            expect(result).toEqual(mockUser);
            expect(mockDb.update).toHaveBeenCalled();
        });

        it("should return null when user not found", async () => {
            mockDb.update.mockReturnValueOnce({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([]),
                    }),
                }),
            });

            const result = await repository.update(randomUUID() as UUID, {});

            expect(result).toBeNull();
        });
    });

    describe("delete", () => {
        it("should return true when deleted", async () => {
            const result = await repository.delete(mockUser.id);

            expect(result).toBe(true);
            expect(mockDb.delete).toHaveBeenCalled();
        });

        it("should return false when user not found", async () => {
            mockDb.delete.mockReturnValueOnce({
                where: jest.fn().mockResolvedValue({ rowCount: 0 }),
            });

            const result = await repository.delete(randomUUID() as UUID);

            expect(result).toBe(false);
        });
    });

    describe("getBalance", () => {
        it("should return user balance", async () => {
            const balanceData = { id: mockUser.id, balance: "100.50" };
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue([balanceData]),
                    }),
                }),
            });

            const result = await repository.getBalance(mockUser.id);

            expect(result).toEqual({ userId: mockUser.id, balance: "100.50" });
        });

        it("should return null when user not found", async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue([]),
                    }),
                }),
            });

            const result = await repository.getBalance(randomUUID() as UUID);

            expect(result).toBeNull();
        });
    });

    describe("getQuartierAssignment", () => {
        it("should return quartier assignment", async () => {
            const assignment = {
                userId: mockUser.id,
                quartierId: randomUUID(),
            };
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue([assignment]),
                    }),
                }),
            });

            const result = await repository.getQuartierAssignment(mockUser.id);

            expect(result).toEqual(assignment);
        });

        it("should return null when no assignment", async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue([]),
                    }),
                }),
            });

            const result = await repository.getQuartierAssignment(
                randomUUID() as UUID,
            );

            expect(result).toBeNull();
        });
    });

    describe("revokeRefreshTokens", () => {
        it("should revoke tokens and return count", async () => {
            mockDb.update.mockReturnValueOnce({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue({ rowCount: 5 }),
                }),
            });

            const result = await repository.revokeRefreshTokens(mockUser.id);

            expect(result).toBe(5);
        });
    });

    describe("updateStatus", () => {
        it("should update user status", async () => {
            const result = await repository.updateStatus(mockUser.id, false);

            expect(result).toEqual(mockUser);
        });
    });

    describe("updateRole", () => {
        it("should update user role", async () => {
            const result = await repository.updateRole(mockUser.id, "admin");

            expect(result).toEqual(mockUser);
        });
    });
});
