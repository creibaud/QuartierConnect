import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { desc, eq, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { TransferPointsDto } from "./dto/transfer-points.dto";

const MIN_BALANCE = -10;

@Injectable()
export class PointsService {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {}

    async getBalance(userId: string): Promise<{ balance: number }> {
        const [row] = await this.db
            .select()
            .from(schema.pointsBalances)
            .where(eq(schema.pointsBalances.userId, userId));

        return { balance: row?.balance ?? 0 };
    }

    async getHistory(
        userId: string,
        page = 1,
        limit = 20,
    ): Promise<schema.PointsTransaction[]> {
        const skip = (page - 1) * limit;
        return this.db
            .select()
            .from(schema.pointsTransactions)
            .where(
                or(
                    eq(schema.pointsTransactions.senderId, userId),
                    eq(schema.pointsTransactions.recipientId, userId),
                ),
            )
            .orderBy(desc(schema.pointsTransactions.createdAt))
            .offset(skip)
            .limit(limit);
    }

    async transfer(senderId: string, dto: TransferPointsDto): Promise<void> {
        if (senderId === dto.recipientId) {
            throw new BadRequestException("Cannot transfer points to yourself");
        }

        await this.db.transaction(async (tx) => {
            const [senderRow] = await tx.execute<{
                id: string;
                balance: number;
            }>(
                sql`SELECT id, balance FROM points_balances WHERE user_id = ${senderId} FOR UPDATE`,
            );

            const currentBalance = senderRow?.balance ?? 0;

            if (currentBalance - dto.amount < MIN_BALANCE) {
                throw new BadRequestException(
                    `Insufficient balance: would go below ${MIN_BALANCE}`,
                );
            }

            await tx
                .insert(schema.pointsBalances)
                .values({
                    userId: senderId,
                    balance: currentBalance - dto.amount,
                })
                .onConflictDoUpdate({
                    target: schema.pointsBalances.userId,
                    set: {
                        balance: sql`points_balances.balance - ${dto.amount}`,
                        updatedAt: new Date(),
                    },
                });

            await tx
                .insert(schema.pointsBalances)
                .values({ userId: dto.recipientId, balance: dto.amount })
                .onConflictDoUpdate({
                    target: schema.pointsBalances.userId,
                    set: {
                        balance: sql`points_balances.balance + ${dto.amount}`,
                        updatedAt: new Date(),
                    },
                });

            await tx.insert(schema.pointsTransactions).values({
                senderId,
                recipientId: dto.recipientId,
                amount: dto.amount,
                note: dto.note,
            });
        });
    }
}
