import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { TransferPointsDto } from "./dto/transfer-points.dto";

const MIN_BALANCE = -10;

type TransactionClient = Parameters<
    Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0];

export type PointsTransactionWithEmails = schema.PointsTransaction & {
    senderEmail: string | null;
    recipientEmail: string | null;
    senderName: string | null;
    recipientName: string | null;
};

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
    ): Promise<PointsTransactionWithEmails[]> {
        const skip = (page - 1) * limit;
        const transactions = await this.db
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

        if (transactions.length === 0) return [];

        const counterpartIds = [
            ...new Set(
                transactions.flatMap((tx) => [tx.senderId, tx.recipientId]),
            ),
        ];
        const users = await this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
            })
            .from(schema.users)
            .where(inArray(schema.users.id, counterpartIds));
        const emailById = new Map(users.map((user) => [user.id, user.email]));
        const nameById = new Map(
            users.map((user) => [
                user.id,
                [user.firstName, user.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || null,
            ]),
        );

        return transactions.map((tx) => ({
            ...tx,
            senderEmail: emailById.get(tx.senderId) ?? null,
            recipientEmail: emailById.get(tx.recipientId) ?? null,
            senderName: nameById.get(tx.senderId) ?? null,
            recipientName: nameById.get(tx.recipientId) ?? null,
        }));
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

            await this.applyBalanceDelta(
                tx,
                senderId,
                dto.recipientId,
                dto.amount,
                currentBalance,
            );

            await tx.insert(schema.pointsTransactions).values({
                senderId,
                recipientId: dto.recipientId,
                amount: dto.amount,
                note: dto.note,
            });
        });
    }

    private async applyBalanceDelta(
        tx: TransactionClient,
        senderId: string,
        recipientId: string,
        amount: number,
        senderCurrentBalance: number,
    ): Promise<void> {
        await tx
            .insert(schema.pointsBalances)
            .values({
                userId: senderId,
                balance: senderCurrentBalance - amount,
            })
            .onConflictDoUpdate({
                target: schema.pointsBalances.userId,
                set: {
                    balance: sql`points_balances.balance - ${amount}`,
                    updatedAt: new Date(),
                },
            });
        await tx
            .insert(schema.pointsBalances)
            .values({ userId: recipientId, balance: amount })
            .onConflictDoUpdate({
                target: schema.pointsBalances.userId,
                set: {
                    balance: sql`points_balances.balance + ${amount}`,
                    updatedAt: new Date(),
                },
            });
    }

    async reserveServicePayment(p: {
        contractId: string;
        payerId: string;
        payeeId: string;
        amount: number;
        note?: string;
    }): Promise<void> {
        await this.db.insert(schema.pointsTransactions).values({
            senderId: p.payerId,
            recipientId: p.payeeId,
            amount: p.amount,
            note: p.note ?? null,
            contractId: p.contractId,
            type: "service_payment",
            status: "pending",
        });
    }

    async completeServicePayment(contractId: string): Promise<void> {
        await this.db.transaction(async (tx) => {
            const [txn] = await tx
                .select()
                .from(schema.pointsTransactions)
                .where(
                    and(
                        eq(schema.pointsTransactions.contractId, contractId),
                        eq(schema.pointsTransactions.type, "service_payment"),
                    ),
                )
                .limit(1)
                .for("update");
            if (!txn) {
                throw new NotFoundException(
                    "No service payment found for this contract",
                );
            }
            if (txn.status === "completed") return; // idempotent
            if (txn.status === "cancelled") {
                throw new BadRequestException("Service payment was cancelled");
            }

            const [senderRow] = await tx.execute<{ balance: number }>(
                sql`SELECT balance FROM points_balances WHERE user_id = ${txn.senderId} FOR UPDATE`,
            );
            const currentBalance = senderRow?.balance ?? 0;
            if (currentBalance - txn.amount < MIN_BALANCE) {
                throw new BadRequestException(
                    `Insufficient balance: would go below ${MIN_BALANCE}`,
                );
            }

            await this.applyBalanceDelta(
                tx,
                txn.senderId,
                txn.recipientId,
                txn.amount,
                currentBalance,
            );
            await tx
                .update(schema.pointsTransactions)
                .set({ status: "completed", completedAt: new Date() })
                .where(eq(schema.pointsTransactions.id, txn.id));
        });
    }

    async isServicePaymentCompleted(contractId: string): Promise<boolean> {
        const [txn] = await this.db
            .select({ status: schema.pointsTransactions.status })
            .from(schema.pointsTransactions)
            .where(
                and(
                    eq(schema.pointsTransactions.contractId, contractId),
                    eq(schema.pointsTransactions.type, "service_payment"),
                ),
            )
            .limit(1);
        return txn?.status === "completed";
    }

    async cancelServicePayment(contractId: string): Promise<void> {
        // Idempotent no-op when no pending row matches: cancelling an absent
        // or already-settled payment is safe (unlike completeServicePayment,
        // which throws NotFoundException when the payment is missing).
        await this.db
            .update(schema.pointsTransactions)
            .set({ status: "cancelled" })
            .where(
                and(
                    eq(schema.pointsTransactions.contractId, contractId),
                    eq(schema.pointsTransactions.type, "service_payment"),
                    eq(schema.pointsTransactions.status, "pending"),
                ),
            );
    }
}
