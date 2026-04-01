import type { UUID } from "node:crypto";
import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { PaginationHelper } from "src/common/helpers/pagination.helper";
import { PermissionHelper } from "src/common/helpers/permission.helper";
import { type User } from "src/database/drizzle/schema";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";
import {
    UpdateUserDto,
    UpdateUserRoleDto,
    UpdateUserStatusDto,
} from "src/modules/users/dto/update-user.dto";
import { UserQueryDto } from "src/modules/users/dto/user-query.dto";
import type { IUserRepository } from "src/modules/users/users.repository";

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly outbox: OutboxService,
    ) {}

    async findAll(query: UserQueryDto) {
        const result = await this.userRepository.findAll({
            page: query.page,
            limit: query.limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
            search: query.search,
            role: query.role,
            isActive: query.isActive,
        });

        return PaginationHelper.buildPaginatedResponse(
            result.data.map((user) => this.sanitizeUser(user)),
            result.total,
            result.page,
            result.limit,
        );
    }

    async findOne(id: UUID) {
        const user = await this.userRepository.findOne(id);

        if (!user) {
            throw new NotFoundException("User not found");
        }

        return this.sanitizeUser(user);
    }

    async getMyProfile(userId: UUID) {
        return this.findOne(userId);
    }

    async updateMyProfile(userId: UUID, dto: UpdateUserDto) {
        const updated = await this.userRepository.update(userId, dto);

        if (!updated) {
            throw new NotFoundException("User not found");
        }

        await this.outbox.publish({
            aggregateType: "user",
            aggregateId: updated.id,
            eventType: OUTBOX_EVENT_TYPES.userUpdated,
            payload: {
                id: updated.id,
                email: updated.email,
                firstName: updated.firstName,
                lastName: updated.lastName,
                role: updated.role,
                isActive: updated.isActive,
                updatedAt: updated.updatedAt,
            },
        });

        this.logger.log(`User profile updated: ${userId}`);

        return this.sanitizeUser(updated);
    }

    async updateRole(id: UUID, dto: UpdateUserRoleDto) {
        const user = await this.findOne(id);

        PermissionHelper.validateModifyPermission(id, id, "admin");

        if (user.role === "admin") {
            throw new ForbiddenException("Cannot change an admin's role");
        }

        const updated = await this.userRepository.updateRole(id, dto.role);

        if (!updated) {
            throw new NotFoundException("User not found");
        }

        await this.outbox.publish({
            aggregateType: "user",
            aggregateId: updated.id,
            eventType: OUTBOX_EVENT_TYPES.userUpdated,
            payload: {
                id: updated.id,
                email: updated.email,
                firstName: updated.firstName,
                lastName: updated.lastName,
                role: updated.role,
                isActive: updated.isActive,
                updatedAt: updated.updatedAt,
            },
        });

        this.logger.log(`User role updated: ${id} → ${dto.role}`);

        return this.sanitizeUser(updated);
    }

    async updateStatus(id: UUID, dto: UpdateUserStatusDto) {
        const user = await this.findOne(id);

        PermissionHelper.validateModifyPermission(id, id, "admin");

        if (user.role === "admin") {
            throw new ForbiddenException("Cannot deactivate an admin");
        }

        const updated = await this.userRepository.updateStatus(
            id,
            dto.isActive,
        );

        if (!updated) {
            throw new NotFoundException("User not found");
        }

        await this.outbox.publish({
            aggregateType: "user",
            aggregateId: updated.id,
            eventType: OUTBOX_EVENT_TYPES.userUpdated,
            payload: {
                id: updated.id,
                email: updated.email,
                firstName: updated.firstName,
                lastName: updated.lastName,
                role: updated.role,
                isActive: updated.isActive,
                updatedAt: updated.updatedAt,
            },
        });

        this.logger.log(
            `User status updated: ${id} → ${dto.isActive ? "active" : "inactive"}`,
        );

        return this.sanitizeUser(updated);
    }

    async getBalance(userId: UUID) {
        const balance = await this.userRepository.getBalance(userId);

        if (!balance) {
            throw new NotFoundException("User not found");
        }

        return balance;
    }

    async exportMyData(userId: UUID) {
        const user = await this.userRepository.findOne(userId);

        if (!user) {
            throw new NotFoundException("User not found");
        }

        const quartierAssignment =
            await this.userRepository.getQuartierAssignment(userId);

        this.logger.log(`RGPD data export requested by user: ${userId}`);

        return {
            exportedAt: new Date(),
            profile: this.sanitizeUser(user),
            quartierAssignment: quartierAssignment ?? null,
        };
    }

    async deleteMyAccount(userId: UUID) {
        const anonymizedEmail = `deleted_${userId}@deleted.com`;

        await this.userRepository.update(userId, {
            isActive: false,
            firstName: "Deleted",
            lastName: "Deleted",
            email: anonymizedEmail,
        });

        await this.userRepository.revokeRefreshTokens(userId);

        await this.outbox.publish({
            aggregateType: "user",
            aggregateId: userId,
            eventType: OUTBOX_EVENT_TYPES.userAnonymized,
            payload: {
                userId,
                anonymizedAt: new Date(),
            },
        });

        this.logger.log(`Account deleted (anonymized) for user: ${userId}`);

        return { message: "Account deleted" };
    }

    private sanitizeUser(user: User) {
        return Object.fromEntries(
            Object.entries(user).filter(([key]) => key !== "password"),
        ) as Omit<User, "password">;
    }
}
