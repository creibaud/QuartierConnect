/**
 * @deprecated Use specialized repositories instead:
 * - AdminGlobalRepository for global counts
 * - AdminPointConfigRepository for point config
 * - AdminEventStatsRepository for event stats
 * - AdminServiceStatsRepository for service stats
 * - AdminMessageVoteStatsRepository for message/vote stats
 */
export { IGlobalCounts } from "src/modules/admin/repositories";

// Legacy interface - no longer used internally but kept for compatibility
export interface IAdminRepository {
    getGlobalCounts(): Promise<any>;
    getUsersByRole(): Promise<any>;
    getUsersByStatus(): Promise<any>;
    findAllPointConfig(): Promise<any>;
    findPointConfig(category: any): Promise<any>;
    createPointConfig(
        category: any,
        basePointsPerHour: any,
        multiplier: any,
        adminId: any,
    ): Promise<any>;
    updatePointConfig(
        category: any,
        basePointsPerHour: any,
        multiplier: any,
        adminId: any,
    ): Promise<any>;
    getEventStatsByCategory(dateFilter: any): Promise<any>;
    getEventRegistrationStats(dateFilter: any): Promise<any>;
    getServicesByCategory(): Promise<any>;
    getServicesByType(): Promise<any>;
    getServicesByStatus(): Promise<any>;
    getTotalMessages(): Promise<any>;
    getMessagesByDay(since: any): Promise<any>;
    getVotesByType(): Promise<any>;
    countVoteResponses(): Promise<any>;
    findReportedMessages(minReports: any): Promise<any>;
    findMessageById(id: any): Promise<any>;
    deleteMessage(id: any): Promise<any>;
}

/**
 * @deprecated Use specialized repositories from ./repositories/index.ts
 */
export class AdminRepository implements IAdminRepository {
    // This class is no longer used. All functionality has been distributed
    // across 5 specialized repositories for better separation of concerns.

    constructor(
        private readonly db: any,
        private readonly mongo: any,
    ) {
        console.warn(
            "AdminRepository is deprecated. Use specialized repositories instead.",
        );
    }

    // Stub methods - not implemented
    async getGlobalCounts() {
        throw new Error("Use AdminGlobalRepository");
    }
    async getUsersByRole() {
        throw new Error("Use AdminGlobalRepository");
    }
    async getUsersByStatus() {
        throw new Error("Use AdminGlobalRepository");
    }
    async findAllPointConfig() {
        throw new Error("Use AdminPointConfigRepository");
    }
    async findPointConfig() {
        throw new Error("Use AdminPointConfigRepository");
    }
    async createPointConfig() {
        throw new Error("Use AdminPointConfigRepository");
    }
    async updatePointConfig() {
        throw new Error("Use AdminPointConfigRepository");
    }
    async getEventStatsByCategory() {
        throw new Error("Use AdminEventStatsRepository");
    }
    async getEventRegistrationStats() {
        throw new Error("Use AdminEventStatsRepository");
    }
    async getServicesByCategory() {
        throw new Error("Use AdminServiceStatsRepository");
    }
    async getServicesByType() {
        throw new Error("Use AdminServiceStatsRepository");
    }
    async getServicesByStatus() {
        throw new Error("Use AdminServiceStatsRepository");
    }
    async getTotalMessages() {
        throw new Error("Use AdminMessageVoteStatsRepository");
    }
    async getMessagesByDay() {
        throw new Error("Use AdminMessageVoteStatsRepository");
    }
    async getVotesByType() {
        throw new Error("Use AdminMessageVoteStatsRepository");
    }
    async countVoteResponses() {
        throw new Error("Use AdminMessageVoteStatsRepository");
    }
    async findReportedMessages() {
        throw new Error("Use AdminMessageVoteStatsRepository");
    }
    async findMessageById() {
        throw new Error("Use AdminMessageVoteStatsRepository");
    }
    async deleteMessage() {
        throw new Error("Use AdminMessageVoteStatsRepository");
    }
}
