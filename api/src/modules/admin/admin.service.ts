import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
    SERVICE_CATEGORIES,
    type ServiceCategory,
} from "src/database/drizzle/schema";
import type { UpdatePointConfigDto } from "src/modules/admin/dto/update-point-config.dto";
import {
    AdminEventStatsRepository,
    AdminGlobalRepository,
    AdminMessageVoteStatsRepository,
    AdminPointConfigRepository,
    AdminServiceStatsRepository,
} from "src/modules/admin/repositories";

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly globalRepository: AdminGlobalRepository,
        private readonly pointConfigRepository: AdminPointConfigRepository,
        private readonly eventStatsRepository: AdminEventStatsRepository,
        private readonly serviceStatsRepository: AdminServiceStatsRepository,
        private readonly messageVoteStatsRepository: AdminMessageVoteStatsRepository,
    ) {}

    async getGlobalStats() {
        return this.globalRepository.getGlobalCounts();
    }

    async getUserStats() {
        const [byRole, byStatus] = await Promise.all([
            this.globalRepository.getUsersByRole(),
            this.globalRepository.getUsersByStatus(),
        ]);

        return { byRole, byStatus };
    }

    async getEventStats(period?: "week" | "month" | "year") {
        const dateFilter = this.buildDateFilter(period);

        const [byCategory, registrationStats] = await Promise.all([
            this.eventStatsRepository.getByCategory(dateFilter),
            this.eventStatsRepository.getRegistrationStats(dateFilter),
        ]);

        return {
            byCategory,
            registrationStats: registrationStats ?? {
                _id: null,
                totalRegistrations: 0,
                avgRegistrations: 0,
            },
        };
    }

    async getServiceStats() {
        const [byCategory, byType, byStatus] = await Promise.all([
            this.serviceStatsRepository.getByCategory(),
            this.serviceStatsRepository.getByType(),
            this.serviceStatsRepository.getByStatus(),
        ]);

        return { byCategory, byType, byStatus };
    }

    async getMessageStats() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [total, last7Days] = await Promise.all([
            this.messageVoteStatsRepository.getTotalMessages(),
            this.messageVoteStatsRepository.getMessagesByDay(sevenDaysAgo),
        ]);

        return { total, last7Days };
    }

    async getVoteStats() {
        const [byType, totalResponses] = await Promise.all([
            this.messageVoteStatsRepository.getVotesByType(),
            this.messageVoteStatsRepository.countVoteResponses(),
        ]);

        return { byType, totalResponses };
    }

    async getPointConfig() {
        const rows = await this.pointConfigRepository.findAll();

        const configMap = Object.fromEntries(
            rows.map((r) => [
                r.category,
                {
                    basePointsPerHour: Number(r.basePointsPerHour),
                    multiplier: Number(r.multiplier),
                    updatedAt: r.updatedAt,
                    updatedBy: r.updatedBy,
                },
            ]),
        );

        for (const category of SERVICE_CATEGORIES) {
            if (!configMap[category]) {
                configMap[category] = {
                    basePointsPerHour: 2,
                    multiplier: 1,
                    updatedAt: new Date(),
                    updatedBy: null,
                };
            }
        }

        return configMap;
    }

    async updatePointConfig(
        category: ServiceCategory,
        dto: UpdatePointConfigDto,
        adminId: string,
    ) {
        const existing =
            await this.pointConfigRepository.findByCategory(category);

        if (!existing) {
            const created = await this.pointConfigRepository.create(
                category,
                dto.basePointsPerHour.toString(),
                dto.multiplier.toString(),
                adminId,
            );

            this.logger.log(
                `Point config created for category ${category} by admin ${adminId}`,
            );

            return {
                category: created.category,
                basePointsPerHour: Number(created.basePointsPerHour),
                multiplier: Number(created.multiplier),
                updatedAt: created.updatedAt,
                updatedBy: created.updatedBy,
            };
        }

        const updated = await this.pointConfigRepository.update(
            category,
            dto.basePointsPerHour.toString(),
            dto.multiplier.toString(),
            adminId,
        );

        this.logger.log(
            `Point config updated for category ${category} by admin ${adminId}`,
        );

        if (!updated) {
            throw new NotFoundException(
                `Point config for category "${category}" not found`,
            );
        }

        return {
            category: updated.category,
            basePointsPerHour: Number(updated.basePointsPerHour),
            multiplier: Number(updated.multiplier),
            updatedAt: updated.updatedAt,
            updatedBy: updated.updatedBy,
        };
    }

    async getReportedMessages(minReports = 1) {
        const messages =
            await this.messageVoteStatsRepository.findReportedMessages(
                minReports,
            );

        return messages.map((msg) => {
            const { _id, ...rest } = msg;
            return {
                id: _id?.toString(),
                ...rest,
            };
        });
    }

    async deleteReportedMessage(messageId: string) {
        const message =
            await this.messageVoteStatsRepository.findMessageById(messageId);

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        await this.messageVoteStatsRepository.deleteMessage(messageId);

        this.logger.log(`Reported message ${messageId} deleted by admin`);

        return { message: "Message deleted successfully" };
    }

    private buildDateFilter(
        period?: "week" | "month" | "year",
    ): Record<string, unknown> {
        if (!period) return {};

        const from = new Date();
        if (period === "week") from.setDate(from.getDate() - 7);
        else if (period === "month") from.setMonth(from.getMonth() - 1);
        else from.setFullYear(from.getFullYear() - 1);

        return { createdAt: { $gte: from } };
    }
}
