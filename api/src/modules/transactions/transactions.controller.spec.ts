import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";

describe("TransactionsController", () => {
    let controller: TransactionsController;
    let service: TransactionsService;

    const mockUser = {
        id: "user-uuid",
        email: "user@test.local",
        role: "resident" as const,
        isActive: true,
    };

    const mockAdmin = {
        id: "admin-uuid",
        email: "admin@test.local",
        role: "admin" as const,
        isActive: true,
    };

    const mockTransaction = {
        id: "transaction-uuid",
        fromUserId: mockUser.id,
        toUserId: "other-user-id",
        points: 2,
        type: "service",
        description: "Service completed",
        createdAt: new Date(),
    };

    const mockAdjustment = {
        id: "adjustment-uuid",
        userId: mockUser.id,
        points: 5,
        type: "adjustment",
        description: "Admin adjustment",
        createdAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TransactionsController],
            providers: [
                {
                    provide: TransactionsService,
                    useValue: {
                        findMyHistory: jest.fn(),
                        findAll: jest.fn(),
                        findOne: jest.fn(),
                        createAdjustment: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<TransactionsController>(TransactionsController);
        service = module.get<TransactionsService>(TransactionsService);
    });

    describe("findMyHistory", () => {
        it("should return user's transaction history (paginated)", async () => {
            const query = { page: 1, limit: 10 };
            const paginated = {
                data: [mockTransaction],
                meta: {
                    total: 5,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findMyHistory.mockResolvedValue(paginated);

            const result = await controller.findMyHistory(mockUser, query);

            expect(service.findMyHistory).toHaveBeenCalledWith(
                mockUser.id,
                query,
            );
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(5);
        });

        it("should support sorting by date", async () => {
            const query = {
                page: 1,
                limit: 10,
                sortBy: "createdAt",
                sortOrder: "desc",
            };
            const paginated = {
                data: [mockTransaction],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findMyHistory.mockResolvedValue(paginated);

            const result = await controller.findMyHistory(mockUser, query);

            expect(service.findMyHistory).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({ sortBy: "createdAt" }),
            );
            expect(result.data).toHaveLength(1);
        });

        it("should return empty list if no transactions", async () => {
            const query = { page: 1, limit: 10 };
            const empty = {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit: 10,
                    pages: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findMyHistory.mockResolvedValue(empty);

            const result = await controller.findMyHistory(mockUser, query);

            expect(result.data).toHaveLength(0);
        });

        it("should support pagination", async () => {
            const query = { page: 2, limit: 5 };
            const paginated = {
                data: [mockTransaction],
                meta: {
                    total: 12,
                    page: 2,
                    limit: 5,
                    pages: 3,
                    hasNextPage: true,
                    hasPrevPage: true,
                },
            };
            service.findMyHistory.mockResolvedValue(paginated);

            const result = await controller.findMyHistory(mockUser, query);

            expect(result.meta.page).toBe(2);
            expect(result.meta.pages).toBe(3);
            expect(result.meta.hasNextPage).toBe(true);
        });
    });

    describe("findAll", () => {
        it("should return all transactions (admin only)", async () => {
            const query = { page: 1, limit: 10 };
            const paginated = {
                data: [mockTransaction],
                meta: {
                    total: 10,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findAll.mockResolvedValue(paginated);

            const result = await controller.findAll(query);

            expect(service.findAll).toHaveBeenCalledWith(query);
            expect(result.data).toHaveLength(1);
        });

        it("should support filtering by type", async () => {
            const query = { page: 1, limit: 10, type: "service" };
            const paginated = {
                data: [mockTransaction],
                meta: {
                    total: 5,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findAll.mockResolvedValue(paginated);

            const result = await controller.findAll(query);

            expect(service.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ type: "service" }),
            );
            expect(result.data).toHaveLength(1);
        });

        it("should return empty list if no transactions match", async () => {
            const query = { page: 1, limit: 10, type: "nonexistent" };
            const empty = {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit: 10,
                    pages: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findAll.mockResolvedValue(empty);

            const result = await controller.findAll(query);

            expect(result.data).toHaveLength(0);
        });
    });

    describe("findOne", () => {
        it("should return a transaction by ID", async () => {
            service.findOne.mockResolvedValue(mockTransaction);

            const result = await controller.findOne("transaction-uuid");

            expect(service.findOne).toHaveBeenCalledWith("transaction-uuid");
            expect(result.id).toBe("transaction-uuid");
        });

        it("should throw NotFoundException if not found", async () => {
            service.findOne.mockRejectedValue(
                new NotFoundException("Transaction not found"),
            );

            await expect(controller.findOne("non-existent")).rejects.toThrow(
                NotFoundException,
            );
        });

        it("should return all transaction details", async () => {
            service.findOne.mockResolvedValue(mockTransaction);

            const result = await controller.findOne("transaction-uuid");

            expect(result).toHaveProperty("fromUserId");
            expect(result).toHaveProperty("toUserId");
            expect(result).toHaveProperty("points");
            expect(result).toHaveProperty("type");
        });
    });

    describe("createAdjustment", () => {
        it("should create a manual balance adjustment (admin only)", async () => {
            const adjustmentDto = {
                userId: mockUser.id,
                points: 5,
                reason: "Bugfix",
            };
            service.createAdjustment.mockResolvedValue(mockAdjustment);

            const result = await controller.createAdjustment(
                mockAdmin,
                adjustmentDto,
            );

            expect(service.createAdjustment).toHaveBeenCalledWith(
                mockAdmin.id,
                adjustmentDto,
            );
            expect(result.type).toBe("adjustment");
            expect(result.points).toBe(5);
        });

        it("should deduct points when negative", async () => {
            const adjustmentDto = {
                userId: mockUser.id,
                points: -3,
                reason: "Penalty",
            };
            const deduction = {
                ...mockAdjustment,
                points: -3,
                description: "Penalty",
            };
            service.createAdjustment.mockResolvedValue(deduction);

            const result = await controller.createAdjustment(
                mockAdmin,
                adjustmentDto,
            );

            expect(result.points).toBe(-3);
        });

        it("should require admin role", async () => {
            const adjustmentDto = {
                userId: mockUser.id,
                points: 5,
                reason: "Bugfix",
            };
            service.createAdjustment.mockRejectedValue(
                new ForbiddenException("Admin access required"),
            );

            await expect(
                controller.createAdjustment(mockUser, adjustmentDto),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should track reason for audit trail", async () => {
            const adjustmentDto = {
                userId: mockUser.id,
                points: 10,
                reason: "Promotion bonus",
            };
            service.createAdjustment.mockResolvedValue({
                ...mockAdjustment,
                description: "Promotion bonus",
            });

            const result = await controller.createAdjustment(
                mockAdmin,
                adjustmentDto,
            );

            expect(service.createAdjustment).toHaveBeenCalledWith(
                mockAdmin.id,
                expect.objectContaining({ reason: "Promotion bonus" }),
            );
        });
    });

    describe("transaction filtering", () => {
        it("should filter by date range", async () => {
            const query = {
                page: 1,
                limit: 10,
                startDate: "2026-03-01",
                endDate: "2026-03-31",
            };
            const paginated = {
                data: [mockTransaction],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findAll.mockResolvedValue(paginated);

            const result = await controller.findAll(query);

            expect(result.data).toHaveLength(1);
        });

        it("should filter by user ID (admin)", async () => {
            const query = { page: 1, limit: 10, userId: mockUser.id };
            const paginated = {
                data: [mockTransaction],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findAll.mockResolvedValue(paginated);

            const result = await controller.findAll(query);

            expect(result.data).toHaveLength(1);
        });
    });
});
