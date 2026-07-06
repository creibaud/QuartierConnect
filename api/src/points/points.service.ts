import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    POINTS_SETTLED_EVENT,
    PointsSettledEvent,
} from "../common/notification-events";
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

export type TransferResult = {
    transaction: schema.PointsTransaction;
    senderBalance: number;
    recipientBalance: number;
};

@Injectable()
export class PointsService {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly eventEmitter: EventEmitter2,
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

    async transfer(
        senderId: string,
        dto: TransferPointsDto,
    ): Promise<TransferResult> {
        if (senderId === dto.recipientId) {
            throw new BadRequestException({
                code: "SELF_TRANSFER",
                message: "Cannot transfer points to yourself",
            });
        }

        try {
            return await this.db.transaction(async (tx) => {
                await this.assertRecipientExists(tx, dto.recipientId);

                const balances = await this.lockBalances(tx, [
                    senderId,
                    dto.recipientId,
                ]);
                const currentBalance = balances.get(senderId) ?? 0;

                if (currentBalance - dto.amount < MIN_BALANCE) {
                    throw new BadRequestException({
                        code: "INSUFFICIENT_BALANCE",
                        message: "Insufficient balance for this transfer",
                    });
                }

                await this.applyBalanceDelta(
                    tx,
                    senderId,
                    dto.recipientId,
                    dto.amount,
                );

                const [transaction] = await tx
                    .insert(schema.pointsTransactions)
                    .values({
                        senderId,
                        recipientId: dto.recipientId,
                        amount: dto.amount,
                        note: dto.note,
                    })
                    .returning();

                return {
                    transaction,
                    senderBalance: currentBalance - dto.amount,
                    recipientBalance:
                        (balances.get(dto.recipientId) ?? 0) + dto.amount,
                };
            });
        } catch (err) {
            throw this.mapPostgresConcurrencyError(err);
        }
    }

    // Locks both balance rows in a deterministic (sorted) order so crossed
    // transfers (A→B ‖ B→A) can never deadlock, and inserts missing rows
    // first so the FOR UPDATE actually serializes first-time senders.
    private async lockBalances(
        tx: TransactionClient,
        userIds: [string, string],
    ): Promise<Map<string, number>> {
        const ids = [...userIds].sort();
        await tx
            .insert(schema.pointsBalances)
            .values(ids.map((userId) => ({ userId, balance: 0 })))
            .onConflictDoNothing();
        const rows = await tx.execute<{ user_id: string; balance: number }>(
            sql`SELECT user_id, balance FROM points_balances WHERE user_id IN (${ids[0]}, ${ids[1]}) ORDER BY user_id FOR UPDATE`,
        );
        return new Map(rows.map((row) => [row.user_id, row.balance]));
    }

    // Postgres can still abort a transaction under extreme concurrency
    // (deadlock detector) or through the balance CHECK constraint; both must
    // surface as actionable 4xx responses instead of raw 500s.
    private mapPostgresConcurrencyError(err: unknown): unknown {
        const code = (err as { code?: string })?.code;
        if (code === "40P01") {
            return new BadRequestException({
                code: "CONCURRENT_UPDATE",
                message: "Concurrent update detected, please retry",
            });
        }
        if (code === "23514") {
            return new BadRequestException({
                code: "INSUFFICIENT_BALANCE",
                message: "Insufficient balance for this transfer",
            });
        }
        return err;
    }

    // The recipient id is a foreign key of points_balances and
    // points_transactions: an unknown or deactivated account must be rejected
    // with a 400 before any write, instead of surfacing a raw FK violation.
    private async assertRecipientExists(
        tx: TransactionClient,
        recipientId: string,
    ): Promise<void> {
        const [recipient] = await tx.execute<{ id: string; role: string }>(
            sql`SELECT id, role FROM users WHERE id = ${recipientId}`,
        );
        if (
            !recipient ||
            recipient.role === "banned" ||
            recipient.role === "deleted"
        ) {
            throw new BadRequestException({
                code: "RECIPIENT_NOT_FOUND",
                message: "Recipient does not exist",
            });
        }
    }

    // Both rows are guaranteed to exist and to be locked by lockBalances,
    // so plain relative updates are race-free here.
    private async applyBalanceDelta(
        tx: TransactionClient,
        senderId: string,
        recipientId: string,
        amount: number,
    ): Promise<void> {
        await tx
            .update(schema.pointsBalances)
            .set({
                balance: sql`points_balances.balance - ${amount}`,
                updatedAt: new Date(),
            })
            .where(eq(schema.pointsBalances.userId, senderId));
        await tx
            .update(schema.pointsBalances)
            .set({
                balance: sql`points_balances.balance + ${amount}`,
                updatedAt: new Date(),
            })
            .where(eq(schema.pointsBalances.userId, recipientId));
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
        let settled: PointsSettledEvent | null = null;
        try {
            settled = await this.settleServicePayment(contractId);
        } catch (err) {
            throw this.mapPostgresConcurrencyError(err);
        }
        if (!settled) return;
        this.emitPointsSettled(settled);
    }

    private async settleServicePayment(
        contractId: string,
    ): Promise<PointsSettledEvent | null> {
        return this.db.transaction(async (tx) => {
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
            if (txn.status === "completed") return null; // idempotent
            if (txn.status === "cancelled") {
                throw new BadRequestException("Service payment was cancelled");
            }

            const balances = await this.lockBalances(tx, [
                txn.senderId,
                txn.recipientId,
            ]);
            const currentBalance = balances.get(txn.senderId) ?? 0;
            if (currentBalance - txn.amount < MIN_BALANCE) {
                throw new BadRequestException({
                    code: "INSUFFICIENT_BALANCE",
                    message: "Insufficient balance for this transfer",
                });
            }

            await this.applyBalanceDelta(
                tx,
                txn.senderId,
                txn.recipientId,
                txn.amount,
            );
            await tx
                .update(schema.pointsTransactions)
                .set({ status: "completed", completedAt: new Date() })
                .where(eq(schema.pointsTransactions.id, txn.id));
            return {
                contractId,
                payerId: txn.senderId,
                payeeId: txn.recipientId,
                amount: txn.amount,
            };
        });
    }

    // Best-effort: the settlement is already committed, a notification
    // failure must never surface to the caller.
    private emitPointsSettled(event: PointsSettledEvent): void {
        try {
            this.eventEmitter.emit(POINTS_SETTLED_EVENT, event);
        } catch {
            return;
        }
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
