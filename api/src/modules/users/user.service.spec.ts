import type { UUID } from "node:crypto";
import { randomUUID } from "node:crypto";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import type { OutboxService } from "src/modules/outbox/outbox.service";
import type { IUserRepository } from "src/modules/users/users.repository";
import { UserService } from "./user.service";

describe("UserService", () => {
    let service: UserService;
    let mockUserRepository: Partial<IUserRepository>;
    let mockOutboxService: Partial<OutboxService>;

    const mockUser = {
        id: randomUUID(),
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
        mockUserRepository = {
            findOne: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            updateRole: jest.fn(),
            updateStatus: jest.fn(),
            getBalance: jest.fn(),
            getQuartierAssignment: jest.fn(),
            revokeRefreshTokens: jest.fn(),
        };

        mockOutboxService = {
            publish: jest.fn().mockResolvedValue(undefined),
        };

        service = new UserService(
            mockUserRepository as IUserRepository,
            mockOutboxService,
        );
    });

    describe("findOne", () => {
        it("should return sanitized user", async () => {
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.findOne(mockUser.id);

            expect(result).not.toHaveProperty("password");
            expect(result.email).toBe(mockUser.email);
        });

        it("should throw NotFoundException when user not found", async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne(randomUUID())).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("findAll", () => {
        it("should return paginated users without passwords", async () => {
            mockUserRepository.findAll.mockResolvedValue({
                data: [mockUser],
                total: 1,
                page: 1,
                limit: 10,
            });

            const result = await service.findAll({
                page: 1,
                limit: 10,
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0]).not.toHaveProperty("password");
        });

        it("should filter by role", async () => {
            mockUserRepository.findAll.mockResolvedValue({
                data: [mockUser],
                total: 1,
                page: 1,
                limit: 10,
            });

            const result = await service.findAll({ role: "resident" });
            expect(result.data[0].role).toBe("resident");
        });
    });

    describe("getBalance", () => {
        it("should return user balance", async () => {
            mockUserRepository.getBalance.mockResolvedValue({
                userId: mockUser.id,
                balance: "100.50",
            });

            const result = await service.getBalance(mockUser.id);

            expect(result.balance).toBe("100.50");
        });

        it("should throw NotFoundException when user not found", async () => {
            mockUserRepository.getBalance.mockResolvedValue(null);

            await expect(service.getBalance(randomUUID())).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("updateMyProfile", () => {
        it("should update profile and publish event", async () => {
            const updates = { firstName: "Updated" };
            const updated = { ...mockUser, ...updates };
            mockUserRepository.update.mockResolvedValue(updated);

            const result = await service.updateMyProfile(mockUser.id, updates);

            expect(mockUserRepository.update).toHaveBeenCalledWith(
                mockUser.id,
                updates,
            );
            expect(mockOutboxService.publish).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: OUTBOX_EVENT_TYPES.userUpdated,
                }),
            );
            expect(result).not.toHaveProperty("password");
        });

        it("should throw NotFoundException when user not found", async () => {
            mockUserRepository.update.mockResolvedValue(null);

            await expect(
                service.updateMyProfile(randomUUID(), {}),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("updateRole", () => {
        it("should update role and publish event", async () => {
            const updated = { ...mockUser, role: "moderator" };
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUserRepository.updateRole.mockResolvedValue(updated);

            const result = await service.updateRole(mockUser.id, {
                role: "moderator",
            });

            expect(mockUserRepository.updateRole).toHaveBeenCalledWith(
                mockUser.id,
                "moderator",
            );
            expect(mockOutboxService.publish).toHaveBeenCalled();
            expect(result.role).toBe("moderator");
        });

        it("should throw ForbiddenException when trying to change admin role", async () => {
            const adminUser = { ...mockUser, role: "admin" };
            mockUserRepository.findOne.mockResolvedValue(adminUser);

            await expect(
                service.updateRole(adminUser.id, { role: "moderator" }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("updateStatus", () => {
        it("should update status and publish event", async () => {
            const updated = { ...mockUser, isActive: false };
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUserRepository.updateStatus.mockResolvedValue(updated);

            const result = await service.updateStatus(mockUser.id, {
                isActive: false,
            });

            expect(mockUserRepository.updateStatus).toHaveBeenCalledWith(
                mockUser.id,
                false,
            );
            expect(mockOutboxService.publish).toHaveBeenCalled();
            expect(result.isActive).toBe(false);
        });

        it("should throw ForbiddenException when trying to deactivate admin", async () => {
            const adminUser = { ...mockUser, role: "admin" };
            mockUserRepository.findOne.mockResolvedValue(adminUser);

            await expect(
                service.updateStatus(adminUser.id, { isActive: false }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("exportMyData", () => {
        it("should export user data with quartier assignment", async () => {
            const quartier = { userId: mockUser.id, quartierId: randomUUID() };
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUserRepository.getQuartierAssignment.mockResolvedValue(
                quartier,
            );

            const result = await service.exportMyData(mockUser.id);

            expect(result.profile).not.toHaveProperty("password");
            expect(result.quartierAssignment).toEqual(quartier);
        });

        it("should return null for quartier when none assigned", async () => {
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUserRepository.getQuartierAssignment.mockResolvedValue(null);

            const result = await service.exportMyData(mockUser.id);

            expect(result.quartierAssignment).toBeNull();
        });
    });

    describe("deleteMyAccount", () => {
        it("should anonymize user and revoke tokens", async () => {
            mockUserRepository.update.mockResolvedValue(mockUser);
            mockUserRepository.revokeRefreshTokens.mockResolvedValue(3);

            const result = await service.deleteMyAccount(mockUser.id);

            expect(mockUserRepository.update).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    isActive: false,
                }),
            );
            expect(mockUserRepository.revokeRefreshTokens).toHaveBeenCalledWith(
                mockUser.id,
            );
            expect(mockOutboxService.publish).toHaveBeenCalled();
            expect(result.message).toBe("Account deleted");
        });
    });
});
