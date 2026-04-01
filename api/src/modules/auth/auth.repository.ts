import { and, eq, gt } from "drizzle-orm";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import {
    refreshTokens,
    users,
    type RefreshToken,
    type User,
} from "src/database/drizzle/schema";

export interface IAuthRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    createUser(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<User>;
    findActiveRefreshToken(token: string): Promise<RefreshToken | null>;
    createRefreshToken(data: {
        userId: string;
        token: string;
        expiresAt: Date;
    }): Promise<void>;
    revokeRefreshToken(id: string): Promise<void>;
    revokeAllUserRefreshTokens(userId: string): Promise<void>;
    deleteAllUserRefreshTokens(userId: string): Promise<void>;
}

export class AuthRepository implements IAuthRepository {
    constructor(private readonly db: DrizzleDB) {}

    async findByEmail(email: string): Promise<User | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        return user ?? null;
    }

    async findById(id: string): Promise<User | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        return user ?? null;
    }

    async createUser(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<User> {
        const [user] = await this.db.insert(users).values(data).returning();

        return user;
    }

    async findActiveRefreshToken(token: string): Promise<RefreshToken | null> {
        const [stored] = await this.db
            .select()
            .from(refreshTokens)
            .where(
                and(
                    eq(refreshTokens.token, token),
                    gt(refreshTokens.expiresAt, new Date()),
                ),
            )
            .limit(1);

        return stored ?? null;
    }

    async createRefreshToken(data: {
        userId: string;
        token: string;
        expiresAt: Date;
    }): Promise<void> {
        await this.db.insert(refreshTokens).values(data);
    }

    async revokeRefreshToken(id: string): Promise<void> {
        await this.db
            .update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.id, id));
    }

    async revokeAllUserRefreshTokens(userId: string): Promise<void> {
        await this.db
            .update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.userId, userId));
    }

    async deleteAllUserRefreshTokens(userId: string): Promise<void> {
        await this.db
            .delete(refreshTokens)
            .where(eq(refreshTokens.userId, userId));
    }
}
