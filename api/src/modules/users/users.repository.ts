import type { UUID } from "node:crypto";
import { and, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { ColumnMap } from "src/common/query/query.helper";
import {
    resolveOrderBy,
    resolvePagination,
} from "src/common/query/query.helper";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import {
    refreshTokens,
    userQuartiers,
    users,
    type User,
} from "src/database/drizzle/schema";

export interface UserFilters {
    search?: string;
    role?: string;
    isActive?: boolean;
}

export interface UserPaginationResult {
    data: User[];
    total: number;
    page: number;
    limit: number;
}

export interface IUserRepository {
    findAll(
        query: UserFilters & {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        },
    ): Promise<UserPaginationResult>;
    findOne(id: UUID): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(data: Partial<User>): Promise<User>;
    update(id: UUID, data: Partial<User>): Promise<User | null>;
    delete(id: UUID): Promise<boolean>;
    getBalance(userId: UUID): Promise<{ userId: UUID; balance: number } | null>;
    getQuartierAssignment(userId: UUID): Promise<object | null>;
    revokeRefreshTokens(userId: UUID): Promise<number>;
    updateStatus(id: UUID, isActive: boolean): Promise<User | null>;
    updateRole(id: UUID, role: string): Promise<User | null>;
}

export class UserRepository implements IUserRepository {
    private readonly USER_COLUMN_MAP: ColumnMap = {
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        balance: users.balance,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
    };

    constructor(private readonly db: DrizzleDB) {}

    async findAll(
        query: UserFilters & {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        },
    ): Promise<UserPaginationResult> {
        const { page = 1, limit = 10 } = query;
        const { offset } = resolvePagination(page, limit);
        const orderBy = resolveOrderBy(
            query.sortBy,
            query.sortOrder,
            this.USER_COLUMN_MAP,
            users.createdAt,
        );

        const filters: (SQL | undefined)[] = [];

        if (query.search) {
            filters.push(
                or(
                    ilike(users.email, `%${query.search}%`),
                    ilike(users.firstName, `%${query.search}%`),
                    ilike(users.lastName, `%${query.search}%`),
                ),
            );
        }

        if (query.role) {
            filters.push(eq(users.role, query.role));
        }

        if (query.isActive !== undefined) {
            filters.push(eq(users.isActive, query.isActive));
        }

        const where = filters.length > 0 ? and(...filters) : undefined;

        const [data, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(users)
                .where(where)
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(users)
                .where(where),
        ]);

        return {
            data,
            total: Number(count),
            page,
            limit,
        };
    }

    async findOne(id: UUID): Promise<User | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        return user ?? null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        return user ?? null;
    }

    async create(data: Partial<User>): Promise<User> {
        const [user] = await this.db.insert(users).values(data).returning();

        return user;
    }

    async update(id: UUID, data: Partial<User>): Promise<User | null> {
        const [user] = await this.db
            .update(users)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(users.id, id))
            .returning();

        return user ?? null;
    }

    async delete(id: UUID): Promise<boolean> {
        const result = await this.db.delete(users).where(eq(users.id, id));

        return result.rowCount > 0;
    }

    async getBalance(
        userId: UUID,
    ): Promise<{ userId: UUID; balance: number } | null> {
        const [user] = await this.db
            .select({
                id: users.id,
                balance: users.balance,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        return user ? { userId: user.id, balance: user.balance } : null;
    }

    async getQuartierAssignment(userId: UUID): Promise<object | null> {
        const [assignment] = await this.db
            .select()
            .from(userQuartiers)
            .where(eq(userQuartiers.userId, userId))
            .limit(1);

        return assignment ?? null;
    }

    async revokeRefreshTokens(userId: UUID): Promise<number> {
        const result = await this.db
            .update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.userId, userId));

        return result.rowCount;
    }

    async updateStatus(id: UUID, isActive: boolean): Promise<User | null> {
        return this.update(id, { isActive });
    }

    async updateRole(id: UUID, role: string): Promise<User | null> {
        return this.update(id, { role });
    }
}
