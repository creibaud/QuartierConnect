import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

describe("AdminController", () => {
    let controller: AdminController;
    let service: AdminService;

    const mockAdmin = {
        id: "admin-uuid",
        email: "admin@test.local",
        role: "admin" as const,
        isActive: true,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AdminController],
            providers: [
                {
                    provide: AdminService,
                    useValue: {
                        getPointConfig: jest.fn(),
                        updatePointConfig: jest.fn(),
                        getGlobalStats: jest.fn(),
                        getEventStats: jest.fn(),
                        getServiceStats: jest.fn(),
                        getMessageStats: jest.fn(),
                        getVoteStats: jest.fn(),
                        getUserStats: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AdminController>(AdminController);
        service = module.get<AdminService>(AdminService);
    });

    describe("getPointConfig", () => {
        it("should return point configuration for all categories", async () => {
            const config = {
                gardening: {
                    basePointsPerHour: 2,
                    multiplier: 1.0,
                    updatedAt: new Date(),
                },
                babysitting: {
                    basePointsPerHour: 2,
                    multiplier: 1.5,
                    updatedAt: new Date(),
                },
                education: {
                    basePointsPerHour: 3,
                    multiplier: 1.2,
                    updatedAt: new Date(),
                },
            };
            service.getPointConfig.mockResolvedValue(config);

            const result = await controller.getPointConfig();

            expect(service.getPointConfig).toHaveBeenCalled();
            expect(result).toEqual(config);
            expect(Object.keys(result)).toContain("gardening");
        });

        it("should include all service categories", async () => {
            const config = {
                babysitting: { basePointsPerHour: 2, multiplier: 1.5 },
                education: { basePointsPerHour: 3, multiplier: 1.2 },
                garden: { basePointsPerHour: 2, multiplier: 1.0 },
                transport: { basePointsPerHour: 2, multiplier: 1.1 },
                repair: { basePointsPerHour: 4, multiplier: 1.3 },
                shopping: { basePointsPerHour: 2, multiplier: 1.0 },
            };
            service.getPointConfig.mockResolvedValue(config);

            const result = await controller.getPointConfig();

            expect(Object.keys(result)).toHaveLength(6);
        });
    });

    describe("updatePointConfig", () => {
        it("should update multiplier for a service category", async () => {
            const updateDto = { multiplier: 1.8 };
            const updated = {
                category: "babysitting",
                basePointsPerHour: 2,
                multiplier: 1.8,
                updatedAt: new Date(),
                updatedBy: mockAdmin.id,
            };
            service.updatePointConfig.mockResolvedValue(updated);

            const result = await controller.updatePointConfig(
                "babysitting",
                updateDto,
                mockAdmin,
            );

            expect(service.updatePointConfig).toHaveBeenCalledWith(
                "babysitting",
                updateDto,
                mockAdmin.id,
            );
            expect(result.multiplier).toBe(1.8);
        });

        it("should throw BadRequestException on invalid multiplier", async () => {
            service.updatePointConfig.mockRejectedValue(
                new BadRequestException("Multiplier must be >= 0.5"),
            );

            await expect(
                controller.updatePointConfig(
                    "babysitting",
                    { multiplier: 0.1 },
                    mockAdmin,
                ),
            ).rejects.toThrow(BadRequestException);
        });

        it("should track admin who updated config", async () => {
            const updateDto = { multiplier: 1.5 };
            const updated = {
                category: "education",
                multiplier: 1.5,
                updatedBy: mockAdmin.id,
            };
            service.updatePointConfig.mockResolvedValue(updated);

            const result = await controller.updatePointConfig(
                "education",
                updateDto,
                mockAdmin,
            );

            expect(result.updatedBy).toBe(mockAdmin.id);
            expect(service.updatePointConfig).toHaveBeenCalledWith(
                "education",
                updateDto,
                mockAdmin.id,
            );
        });

        it("should throw BadRequestException on invalid category", async () => {
            service.updatePointConfig.mockRejectedValue(
                new BadRequestException("Invalid category"),
            );

            await expect(
                controller.updatePointConfig(
                    "invalid_category" as any,
                    { multiplier: 1.5 },
                    mockAdmin,
                ),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe("getGlobalStats", () => {
        it("should return global platform statistics", async () => {
            const stats = {
                users: { total: 150, active: 140 },
                quartiers: 5,
                events: 42,
                services: 28,
                incidents: 13,
                messages: 1240,
            };
            service.getGlobalStats.mockResolvedValue(stats);

            const result = await controller.getGlobalStats();

            expect(service.getGlobalStats).toHaveBeenCalled();
            expect(result.users.total).toBe(150);
            expect(result.events).toBe(42);
        });

        it("should include user statistics breakdown", async () => {
            const stats = {
                users: { total: 150, active: 140, inactive: 10 },
                quartiers: 5,
                events: 42,
            };
            service.getGlobalStats.mockResolvedValue(stats);

            const result = await controller.getGlobalStats();

            expect(result.users.active).toBe(140);
        });
    });

    describe("getEventStats", () => {
        it("should return event statistics", async () => {
            const stats = {
                total: 42,
                byCategory: { social: 15, sport: 10 },
                upcoming: 12,
            };
            service.getEventStats.mockResolvedValue(stats);

            const result = await controller.getEventStats();

            expect(service.getEventStats).toHaveBeenCalledWith(undefined);
            expect(result.total).toBe(42);
        });

        it("should support period filtering", async () => {
            const stats = { total: 10, byCategory: { social: 5 }, upcoming: 3 };
            service.getEventStats.mockResolvedValue(stats);

            const result = await controller.getEventStats("week");

            expect(service.getEventStats).toHaveBeenCalledWith("week");
            expect(result.total).toBe(10);
        });

        it("should support month period", async () => {
            const statsMonth = { total: 25, byCategory: { social: 10 } };
            service.getEventStats.mockResolvedValue(statsMonth);

            const result = await controller.getEventStats("month");

            expect(service.getEventStats).toHaveBeenCalledWith("month");
        });

        it("should support year period", async () => {
            const statsYear = { total: 150, byCategory: { social: 60 } };
            service.getEventStats.mockResolvedValue(statsYear);

            const result = await controller.getEventStats("year");

            expect(service.getEventStats).toHaveBeenCalledWith("year");
        });
    });

    describe("getServiceStats", () => {
        it("should return service statistics breakdown by status", async () => {
            const stats = {
                total: 28,
                byStatus: { open: 12, accepted: 8, completed: 6, cancelled: 2 },
                byCategory: { education: 10, garden: 5 },
            };
            service.getServiceStats.mockResolvedValue(stats);

            const result = await controller.getServiceStats();

            expect(service.getServiceStats).toHaveBeenCalled();
            expect(result.byStatus.open).toBe(12);
            expect(result.total).toBe(28);
        });

        it("should include category breakdown", async () => {
            const stats = {
                total: 28,
                byCategory: { education: 10, garden: 5, transport: 4 },
            };
            service.getServiceStats.mockResolvedValue(stats);

            const result = await controller.getServiceStats();

            expect(Object.keys(result.byCategory).length).toBeGreaterThan(0);
        });
    });

    describe("getMessageStats", () => {
        it("should return message statistics", async () => {
            const stats = {
                totalMessages: 1240,
                totalChats: 87,
                averageMessagesPerChat: 14,
            };
            service.getMessageStats.mockResolvedValue(stats);

            const result = await controller.getMessageStats();

            expect(service.getMessageStats).toHaveBeenCalled();
            expect(result.totalMessages).toBe(1240);
            expect(result.totalChats).toBe(87);
        });

        it("should calculate average messages per chat", async () => {
            const stats = {
                totalMessages: 1000,
                totalChats: 100,
                averageMessagesPerChat: 10,
            };
            service.getMessageStats.mockResolvedValue(stats);

            const result = await controller.getMessageStats();

            expect(result.averageMessagesPerChat).toBe(10);
        });
    });

    describe("getVoteStats", () => {
        it("should return vote statistics", async () => {
            const stats = {
                total: 15,
                active: 4,
                closed: 11,
                totalResponses: 320,
            };
            service.getVoteStats.mockResolvedValue(stats);

            const result = await controller.getVoteStats();

            expect(service.getVoteStats).toHaveBeenCalled();
            expect(result.total).toBe(15);
            expect(result.active).toBe(4);
        });

        it("should include vote breakdown by status", async () => {
            const stats = { total: 15, active: 4, closed: 11 };
            service.getVoteStats.mockResolvedValue(stats);

            const result = await controller.getVoteStats();

            expect(result.active + result.closed).toBe(result.total);
        });
    });

    describe("getUserStats", () => {
        it("should return user statistics with role breakdown", async () => {
            const stats = {
                total: 150,
                active: 140,
                byRole: { resident: 130, admin: 18, super_admin: 2 },
                newThisMonth: 12,
            };
            service.getUserStats.mockResolvedValue(stats);

            const result = await controller.getUserStats();

            expect(service.getUserStats).toHaveBeenCalled();
            expect(result.total).toBe(150);
            expect(result.byRole.resident).toBe(130);
        });

        it("should track new users this month", async () => {
            const stats = {
                total: 150,
                active: 140,
                newThisMonth: 5,
                byRole: {},
            };
            service.getUserStats.mockResolvedValue(stats);

            const result = await controller.getUserStats();

            expect(result.newThisMonth).toBe(5);
        });

        it("should include activity tracking", async () => {
            const stats = { total: 150, active: 140, inactive: 10, byRole: {} };
            service.getUserStats.mockResolvedValue(stats);

            const result = await controller.getUserStats();

            expect(result.active + result.inactive).toBe(result.total);
        });
    });
});
