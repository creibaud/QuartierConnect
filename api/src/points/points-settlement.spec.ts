import { BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import * as schema from "../database/schema";
import { PointsService } from "./points.service";

function makeEmitter() {
    return { emit: jest.fn() } as unknown as EventEmitter2 & {
        emit: jest.Mock;
    };
}

// Hand-rolled fake `db` built from jest spies so the tests assert real
// behaviour (money movement, idempotency, the -10 floor, the cancel guard)
// rather than merely that a chain of no-op stubs was reached.
type Txn = {
    id: string;
    senderId: string;
    recipientId: string;
    amount: number;
    status: string;
};

type SettlementSpies = {
    balanceInsertValues: jest.Mock;
    balanceLockExecute: jest.Mock;
    balanceUpdate: jest.Mock;
    txnInsertValues: jest.Mock;
    updateTable: jest.Mock;
    txnUpdateSet: jest.Mock;
    txnUpdateWhere: jest.Mock;
};

type SettlementState = {
    txn: Txn | null;
    balances: Map<string, number>;
    lockError: Error | null;
    balanceUpdateError: Error | null;
};

const dialect = new PgDialect();

function makePostgresError(code: string): Error {
    return Object.assign(new Error(`postgres error ${code}`), { code });
}

function makeDb(pending: Txn | null, senderBalance: number) {
    const state: SettlementState = {
        txn: pending,
        balances: new Map<string, number>(),
        lockError: null,
        balanceUpdateError: null,
    };
    if (pending) state.balances.set(pending.senderId, senderBalance);

    const spies: SettlementSpies = {
        balanceInsertValues: jest.fn(),
        balanceLockExecute: jest.fn(),
        balanceUpdate: jest.fn(),
        txnInsertValues: jest.fn(),
        updateTable: jest.fn(),
        txnUpdateSet: jest.fn(),
        txnUpdateWhere: jest.fn(),
    };

    const insert = (table: unknown) => {
        if (table === schema.pointsBalances) {
            return {
                values: (rows: { userId: string; balance: number }[]) => {
                    spies.balanceInsertValues(rows);
                    return {
                        onConflictDoNothing: () => {
                            for (const row of rows) {
                                if (!state.balances.has(row.userId)) {
                                    state.balances.set(row.userId, row.balance);
                                }
                            }
                            return undefined;
                        },
                    };
                },
            };
        }
        return {
            values: (row: unknown) => {
                spies.txnInsertValues(row);
                return undefined;
            },
        };
    };

    const applyBalanceUpdate = (
        changes: { balance: SQL },
        condition: unknown,
    ) => {
        if (state.balanceUpdateError) throw state.balanceUpdateError;
        const { sql: expression, params } = dialect.sqlToQuery(changes.balance);
        const amount = params[0] as number;
        const delta = expression.includes("-") ? -amount : amount;
        const userId = dialect.sqlToQuery(condition as SQL).params[0] as string;
        state.balances.set(userId, (state.balances.get(userId) ?? 0) + delta);
        spies.balanceUpdate({ userId, delta });
    };

    const update = (table: unknown) => {
        spies.updateTable(table);
        return {
            set: (changes: Record<string, unknown>) => ({
                where: (condition: unknown) => {
                    if (table === schema.pointsBalances) {
                        applyBalanceUpdate(
                            changes as { balance: SQL },
                            condition,
                        );
                        return undefined;
                    }
                    spies.txnUpdateSet(changes);
                    spies.txnUpdateWhere(condition);
                    // The guarded UPDATE only voids a still-pending row; capture
                    // that match before the assignment mutates the status so
                    // RETURNING reflects whether a row was actually flipped.
                    const matchedPending = state.txn?.status === "pending";
                    if (matchedPending && state.txn) {
                        Object.assign(state.txn, changes);
                    }
                    return {
                        returning: () =>
                            matchedPending && state.txn
                                ? [{ id: state.txn.id }]
                                : [],
                    };
                },
            }),
        };
    };

    const client = {
        select: () => ({
            from: () => ({
                where: () => ({
                    limit: () => ({
                        for: () => (state.txn ? [state.txn] : []),
                    }),
                }),
            }),
        }),
        execute: (query: unknown) => {
            spies.balanceLockExecute(query);
            if (state.lockError) throw state.lockError;
            return [...state.balances.entries()]
                .sort(([a], [b]) => (a < b ? -1 : 1))
                .map(([user_id, balance]) => ({ user_id, balance }));
        },
        insert,
        update,
    };

    const db = {
        transaction: async (cb: (t: typeof client) => Promise<unknown>) =>
            cb(client),
        insert,
        update,
        __spies: spies,
        __state: state,
    };

    return db as unknown as ConstructorParameters<typeof PointsService>[0] & {
        __spies: SettlementSpies;
        __state: SettlementState;
    };
}

describe("PointsService settlement", () => {
    it("reserveServicePayment inserts a pending service_payment and moves no balance", async () => {
        const db = makeDb(null, 0);
        const spies = db.__spies;
        const emitter = makeEmitter();
        const svc = new PointsService(db, emitter);

        await svc.reserveServicePayment({
            contractId: "c1",
            payerId: "payer",
            payeeId: "payee",
            amount: 15,
        });

        expect(spies.txnInsertValues).toHaveBeenCalledTimes(1);
        expect(spies.txnInsertValues).toHaveBeenCalledWith(
            expect.objectContaining({
                senderId: "payer",
                recipientId: "payee",
                amount: 15,
                contractId: "c1",
                type: "service_payment",
                status: "pending",
            }),
        );
        expect(spies.balanceInsertValues).not.toHaveBeenCalled();
        expect(spies.balanceUpdate).not.toHaveBeenCalled();
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("completeServicePayment is idempotent when already completed and moves no money", async () => {
        const db = makeDb(
            {
                id: "t1",
                senderId: "payer",
                recipientId: "payee",
                amount: 5,
                status: "completed",
            },
            0,
        );
        const spies = db.__spies;
        const emitter = makeEmitter();
        const svc = new PointsService(db, emitter);

        await expect(svc.completeServicePayment("c1")).resolves.toBeUndefined();

        expect(spies.balanceLockExecute).not.toHaveBeenCalled();
        expect(spies.balanceInsertValues).not.toHaveBeenCalled();
        expect(spies.balanceUpdate).not.toHaveBeenCalled();
        expect(spies.txnUpdateSet).not.toHaveBeenCalled();
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("completeServicePayment debits payer, credits payee, and marks completed", async () => {
        const db = makeDb(
            {
                id: "t1",
                senderId: "payer",
                recipientId: "payee",
                amount: 30,
                status: "pending",
            },
            100,
        );
        const spies = db.__spies;
        const state = db.__state;
        const emitter = makeEmitter();
        const svc = new PointsService(db, emitter);

        await expect(svc.completeServicePayment("c1")).resolves.toBeUndefined();

        expect(spies.balanceUpdate).toHaveBeenNthCalledWith(1, {
            userId: "payer",
            delta: -30,
        });
        expect(spies.balanceUpdate).toHaveBeenNthCalledWith(2, {
            userId: "payee",
            delta: 30,
        });
        expect(state.balances.get("payer")).toBe(70);
        expect(state.balances.get("payee")).toBe(30);
        expect(spies.txnUpdateSet).toHaveBeenCalledWith(
            expect.objectContaining({ status: "completed" }),
        );
        expect(emitter.emit).toHaveBeenCalledTimes(1);
        expect(emitter.emit).toHaveBeenCalledWith("points.settled", {
            contractId: "c1",
            payerId: "payer",
            payeeId: "payee",
            amount: 30,
        });
    });

    it("completeServicePayment locks both balance rows sorted by user_id with FOR UPDATE, inserting them first", async () => {
        const db = makeDb(
            {
                id: "t1",
                senderId: "payer",
                recipientId: "payee",
                amount: 30,
                status: "pending",
            },
            100,
        );
        const spies = db.__spies;
        const svc = new PointsService(db, makeEmitter());

        await svc.completeServicePayment("c1");

        expect(spies.balanceInsertValues).toHaveBeenCalledWith([
            { userId: "payee", balance: 0 },
            { userId: "payer", balance: 0 },
        ]);
        const { sql: renderedSql, params } = dialect.sqlToQuery(
            spies.balanceLockExecute.mock.calls[0][0] as SQL,
        );
        expect(renderedSql).toContain("IN (");
        expect(renderedSql).toContain("ORDER BY user_id");
        expect(renderedSql).toContain("FOR UPDATE");
        expect(params).toEqual(["payee", "payer"]);
        expect(
            spies.balanceInsertValues.mock.invocationCallOrder[0],
        ).toBeLessThan(spies.balanceLockExecute.mock.invocationCallOrder[0]);
    });

    it("completeServicePayment maps a Postgres deadlock (40P01) to CONCURRENT_UPDATE", async () => {
        const db = makeDb(
            {
                id: "t1",
                senderId: "payer",
                recipientId: "payee",
                amount: 30,
                status: "pending",
            },
            100,
        );
        db.__state.lockError = makePostgresError("40P01");
        const emitter = makeEmitter();
        const svc = new PointsService(db, emitter);

        const error = await svc
            .completeServicePayment("c1")
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toMatchObject({
            code: "CONCURRENT_UPDATE",
            message: "Concurrent update detected, please retry",
        });
        expect(db.__spies.balanceUpdate).not.toHaveBeenCalled();
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("completeServicePayment maps a balance CHECK violation (23514) to INSUFFICIENT_BALANCE", async () => {
        const db = makeDb(
            {
                id: "t1",
                senderId: "payer",
                recipientId: "payee",
                amount: 30,
                status: "pending",
            },
            100,
        );
        db.__state.balanceUpdateError = makePostgresError("23514");
        const emitter = makeEmitter();
        const svc = new PointsService(db, emitter);

        const error = await svc
            .completeServicePayment("c1")
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toMatchObject({
            code: "INSUFFICIENT_BALANCE",
            message: "Insufficient balance for this transfer",
        });
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("completeServicePayment still resolves when the settled notification blows up (best-effort)", async () => {
        const db = makeDb(
            {
                id: "t1",
                senderId: "payer",
                recipientId: "payee",
                amount: 30,
                status: "pending",
            },
            100,
        );
        const emitter = makeEmitter();
        emitter.emit.mockImplementation(() => {
            throw new Error("listener boom");
        });
        const svc = new PointsService(db, emitter);

        await expect(svc.completeServicePayment("c1")).resolves.toBeUndefined();
    });

    it("completeServicePayment rejects below the -10 floor on the locked sender balance without moving money", async () => {
        const db = makeDb(
            {
                id: "t1",
                senderId: "payer",
                recipientId: "payee",
                amount: 20,
                status: "pending",
            },
            -5,
        );
        const spies = db.__spies;
        const state = db.__state;
        const emitter = makeEmitter();
        const svc = new PointsService(db, emitter);

        const error = await svc
            .completeServicePayment("c1")
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as Error).message).toContain("Insufficient");
        expect(spies.balanceLockExecute).toHaveBeenCalledTimes(1);
        expect(spies.balanceUpdate).not.toHaveBeenCalled();
        expect(spies.txnUpdateSet).not.toHaveBeenCalled();
        expect(state.balances.get("payer")).toBe(-5);
        expect(state.txn?.status).toBe("pending");
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("cancelServicePayment voids the pending row and returns true with a pending-guarded WHERE", async () => {
        const db = makeDb(
            {
                id: "t1",
                senderId: "payer",
                recipientId: "payee",
                amount: 5,
                status: "pending",
            },
            0,
        );
        const spies = db.__spies;
        const emitter = makeEmitter();
        const svc = new PointsService(db, emitter);

        await expect(svc.cancelServicePayment("c1")).resolves.toBe(true);

        expect(spies.updateTable).toHaveBeenCalledWith(
            schema.pointsTransactions,
        );
        expect(spies.txnUpdateSet).toHaveBeenCalledWith({
            status: "cancelled",
        });

        const capturedWhere = spies.txnUpdateWhere.mock.calls[0][0];
        const { sql: renderedSql, params } = dialect.sqlToQuery(
            capturedWhere as SQL,
        );
        expect(renderedSql).toContain("status");
        expect(params).toContain("pending");
    });
});
