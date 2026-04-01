import type { UUID } from "node:crypto";
import { and, eq, ilike, sql } from "drizzle-orm";
import {
    resolveOrderBy,
    resolvePagination,
} from "src/common/query/query.helper";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import type { Quartier, UserQuartier } from "src/database/drizzle/schema";
import { quartiers, userQuartiers } from "src/database/drizzle/schema";

export interface IQuartiersRepository {
    // Quartiers CRUD
    create(data: {
        name: string;
        description?: string;
        location: { type: "Point"; coordinates: [number, number] };
        radius: number;
        adminId: UUID;
    }): Promise<Quartier>;

    findById(id: UUID): Promise<Quartier | null>;

    findAll(query: {
        page: number;
        limit: number;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{ data: Quartier[]; total: number }>;

    update(id: UUID, data: Partial<Quartier>): Promise<Quartier | null>;

    delete(id: UUID): Promise<boolean>;

    // Membership management
    addMember(
        quarterId: UUID,
        userId: UUID,
        joinedAt?: Date,
    ): Promise<UserQuartier>;

    removeMember(quarterId: UUID, userId: UUID): Promise<boolean>;

    getMembers(
        quarterId: UUID,
        page: number,
        limit: number,
    ): Promise<{ data: UserQuartier[]; total: number }>;

    getMemberCount(quarterId: UUID): Promise<number>;

    verifyMembership(quarterId: UUID, userId: UUID): Promise<boolean>;

    getUserQuartiers(userId: UUID): Promise<Quartier[]>;
}

/**
 * QuartiersRepository - PostgreSQL abstraction for Quartiers
 * Handles all quartier-related database operations
 */
export class QuartiersRepository implements IQuartiersRepository {
    constructor(private readonly db: DrizzleDB) {}

    async create(data: {
        name: string;
        description?: string;
        location: { type: "Point"; coordinates: [number, number] };
        radius: number;
        adminId: UUID;
    }): Promise<Quartier> {
        const result = await this.db
            .insert(quartiers)
            .values({
                name: data.name,
                description: data.description,
                location: data.location,
                radius: data.radius,
                adminId: data.adminId,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return result[0];
    }

    async findById(id: UUID): Promise<Quartier | null> {
        const result = await this.db
            .select()
            .from(quartiers)
            .where(eq(quartiers.id, id))
            .limit(1);
        return result[0] || null;
    }

    async findAll(query: {
        page: number;
        limit: number;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{ data: Quartier[]; total: number }> {
        const {
            page = 1,
            limit = 10,
            search,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = query;
        const { offset } = resolvePagination(page, limit);

        let whereClause: any = undefined;
        if (search) {
            whereClause = ilike(quartiers.name, `%${search}%`);
        }

        const orderBy = resolveOrderBy(sortBy, sortOrder, {
            createdAt: quartiers.createdAt,
            name: quartiers.name,
        });

        const [data, countData] = await Promise.all([
            this.db
                .select()
                .from(quartiers)
                .where(whereClause)
                .orderBy(orderBy)
                .offset(offset)
                .limit(limit),
            this.db
                .select({ count: sql<number>`cast(count(*) as int)` })
                .from(quartiers)
                .where(whereClause),
        ]);

        return { data: data as Quartier[], total: countData[0]?.count ?? 0 };
    }

    async update(id: UUID, data: Partial<Quartier>): Promise<Quartier | null> {
        const result = await this.db
            .update(quartiers)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(quartiers.id, id))
            .returning();

        return result[0] || null;
    }

    async delete(id: UUID): Promise<boolean> {
        const result = await this.db
            .delete(quartiers)
            .where(eq(quartiers.id, id));
        return result.rowCount > 0;
    }

    async addMember(
        quarterId: UUID,
        userId: UUID,
        joinedAt: Date = new Date(),
    ): Promise<UserQuartier> {
        const result = await this.db
            .insert(userQuartiers)
            .values({
                userId,
                quarterId,
                joinedAt,
            })
            .returning();

        return result[0];
    }

    async removeMember(quarterId: UUID, userId: UUID): Promise<boolean> {
        const result = await this.db
            .delete(userQuartiers)
            .where(
                and(
                    eq(userQuartiers.quarterId, quarterId),
                    eq(userQuartiers.userId, userId),
                ),
            );

        return result.rowCount > 0;
    }

    async getMembers(
        quarterId: UUID,
        page: number,
        limit: number,
    ): Promise<{ data: UserQuartier[]; total: number }> {
        const { offset } = resolvePagination(page, limit);

        const [data, countData] = await Promise.all([
            this.db
                .select()
                .from(userQuartiers)
                .where(eq(userQuartiers.quarterId, quarterId))
                .offset(offset)
                .limit(limit),
            this.db
                .select({ count: sql<number>`cast(count(*) as int)` })
                .from(userQuartiers)
                .where(eq(userQuartiers.quarterId, quarterId)),
        ]);

        return {
            data: data as UserQuartier[],
            total: countData[0]?.count ?? 0,
        };
    }

    async getMemberCount(quarterId: UUID): Promise<number> {
        const result = await this.db
            .select({ count: sql<number>`cast(count(*) as int)` })
            .from(userQuartiers)
            .where(eq(userQuartiers.quarterId, quarterId));

        return result[0]?.count ?? 0;
    }

    async verifyMembership(quarterId: UUID, userId: UUID): Promise<boolean> {
        const result = await this.db
            .select()
            .from(userQuartiers)
            .where(
                and(
                    eq(userQuartiers.quarterId, quarterId),
                    eq(userQuartiers.userId, userId),
                ),
            )
            .limit(1);

        return result.length > 0;
    }

    async getUserQuartiers(userId: UUID): Promise<Quartier[]> {
        const result = await this.db
            .select({
                id: quartiers.id,
                name: quartiers.name,
                description: quartiers.description,
                location: quartiers.location,
                radius: quartiers.radius,
                adminId: quartiers.adminId,
                createdAt: quartiers.createdAt,
                updatedAt: quartiers.updatedAt,
            })
            .from(userQuartiers)
            .innerJoin(quartiers, eq(userQuartiers.quarterId, quartiers.id))
            .where(eq(userQuartiers.userId, userId));

        return result as Quartier[];
    }
}
