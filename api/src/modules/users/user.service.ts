import type { UUID } from "node:crypto";
import {
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { and, eq, ilike, or, sql, SQL } from "drizzle-orm";
import {
    buildPaginatedResult,
    ColumnMap,
    resolveOrderBy,
    resolvePagination,
} from "src/common/query/query.helper";
import { type DrizzleDB } from "src/database/drizzle/drizzle.type";
import { User, users } from "src/database/drizzle/schema";
import {
    UpdateUserDto,
    UpdateUserRoleDto,
    UpdateUserStatusDto,
} from "src/modules/users/dto/update-user.dto";
import { UserQueryDto } from "src/modules/users/dto/user-query.dto";

const USER_COLUMN_MAP: ColumnMap = {
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    balance: users.balance,
    isActive: users.isActive,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
};

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(@Inject("DRIZZLE") private readonly db: DrizzleDB) {}

    async findAll(query: UserQueryDto) {
        const { page = 1, limit = 10 } = query;
        const { offset } = resolvePagination(page, limit);
        const orderBy = resolveOrderBy(
            query.sortBy,
            query.sortOrder,
            USER_COLUMN_MAP,
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

        const [allUsers, [{ count }]] = await Promise.all([
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

        return buildPaginatedResult(
            allUsers.map((user) => this.sanitizeUser(user)),
            Number(count),
            page,
            limit,
        );
    }

    async findOne(id: UUID) {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        if (!user) {
            throw new NotFoundException("User not found");
        }

        return this.sanitizeUser(user);
    }

    async getMyProfile(userId: UUID) {
        return this.findOne(userId);
    }

    async updateMyProfile(userId: UUID, dto: UpdateUserDto) {
        const [updated] = await this.db
            .update(users)
            .set({ ...dto, updatedAt: new Date() })
            .where(eq(users.id, userId))
            .returning();

        if (!updated) {
            throw new NotFoundException("User not found");
        }

        this.logger.log(`User profile updated: ${userId}`);

        return this.sanitizeUser(updated);
    }

    async updateRole(id: UUID, dto: UpdateUserRoleDto) {
        const user = await this.findOne(id);

        if (user.role === "admin") {
            throw new ForbiddenException("Cannot change an admin's role");
        }

        const [updated] = await this.db
            .update(users)
            .set({ role: dto.role, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();

        this.logger.log(`User role updated: ${id} → ${dto.role}`);

        return this.sanitizeUser(updated);
    }

    async updateStatus(id: UUID, dto: UpdateUserStatusDto) {
        const user = await this.findOne(id);

        if (user.role === "admin") {
            throw new ForbiddenException("Cannot deactivate an admin");
        }

        const [updated] = await this.db
            .update(users)
            .set({ isActive: dto.isActive, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();

        this.logger.log(
            `User status updated: ${id} → ${dto.isActive ? "active" : "inactive"}`,
        );

        return this.sanitizeUser(updated);
    }

    private sanitizeUser(user: User) {
        return Object.fromEntries(
            Object.entries(user).filter(([key]) => key !== "password"),
        ) as Omit<User, "password">;
    }
}
