import { BadRequestException } from "@nestjs/common";
import { PgDialect } from "drizzle-orm/pg-core";
import * as schema from "../database/schema";
import { PointsService } from "./points.service";

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
    txnInsertValues: jest.Mock;
    updateTable: jest.Mock;
    updateSet: jest.Mock;
    updateWhere: jest.Mock;
    balanceLockExecute: jest.Mock;
};

function makeDb(pending: Txn | null, senderBalance: number) {
    const state = { txn: pending, balances: new Map<string, number>() };
    if (pending) state.balances.set(pending.senderId, senderBalance);

    const spies: SettlementSpies = {
        balanceInsertValues: jest.fn(),
        txnInsertValues: jest.fn(),
        updateTable: jest.fn(),
        updateSet: jest.fn(),
        updateWhere: jest.fn(),
        balanceLockExecute: jest.fn(),
    };

    const insert = (table: unknown) => {
        if (table === schema.pointsBalances) {
            return {
                values: (row: { userId: string; balance: number }) => {
                    spies.balanceInsertValues(row);
                    return { onConflictDoUpdate: () => undefined };
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

    const update = (table: unknown) => {
        spies.updateTable(table);
        return {
            set: (changes: Partial<Txn>) => {
                spies.updateSet(changes);
                return {
                    where: (condition: unknown) => {
                        spies.updateWhere(condition);
                        if (state.txn) Object.assign(state.txn, changes);
                        return undefined;
                    },
                };
            },
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
        execute: () => {
            spies.balanceLockExecute();
            return [{ balance: state.balances.get(state.txn!.senderId) ?? 0 }];
        },
        insert,
        update,
    };

    const db = {
        transaction: async (cb: (t: typeof client) => Promise<void>) =>
            cb(client),
        insert,
        update,
        __spies: spies,
        __state: state,
    };

    return db as unknown as ConstructorParameters<typeof PointsService>[0] & {
        __spies: SettlementSpies;
        __state: typeof state;
    };
}

describe("PointsService settlement", () => {
    it("reserveServicePayment inserts a pending service_payment and moves no balance", async () => {
        const db = makeDb(null, 0);
        const spies = (db as unknown as { __spies: SettlementSpies }).__spies;
        const svc = new PointsService(db);

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
        const spies = (db as unknown as { __spies: SettlementSpies }).__spies;
        const svc = new PointsService(db);

        await expect(svc.completeServicePayment("c1")).resolves.toBeUndefined();

        expect(spies.balanceLockExecute).not.toHaveBeenCalled();
        expect(spies.balanceInsertValues).not.toHaveBeenCalled();
        expect(spies.updateSet).not.toHaveBeenCalled();
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
        const spies = (db as unknown as { __spies: SettlementSpies }).__spies;
        const svc = new PointsService(db);

        await expect(svc.completeServicePayment("c1")).resolves.toBeUndefined();

        expect(spies.balanceInsertValues).toHaveBeenNthCalledWith(1, {
            userId: "payer",
            balance: 70,
        });
        expect(spies.balanceInsertValues).toHaveBeenNthCalledWith(2, {
            userId: "payee",
            balance: 30,
        });
        expect(spies.updateSet).toHaveBeenCalledWith(
            expect.objectContaining({ status: "completed" }),
        );
    });

    it("completeServicePayment rejects below the -10 floor without moving money", async () => {
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
        const spies = (db as unknown as { __spies: SettlementSpies }).__spies;
        const state = (db as unknown as { __state: { txn: Txn } }).__state;
        const svc = new PointsService(db);

        const error = await svc
            .completeServicePayment("c1")
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as Error).message).toContain("Insufficient");
        expect(spies.balanceInsertValues).not.toHaveBeenCalled();
        expect(spies.updateSet).not.toHaveBeenCalled();
        expect(state.txn.status).toBe("pending");
    });

    it("cancelServicePayment updates the transaction with a pending-guarded WHERE", async () => {
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
        const spies = (db as unknown as { __spies: SettlementSpies }).__spies;
        const svc = new PointsService(db);

        await expect(svc.cancelServicePayment("c1")).resolves.toBeUndefined();

        expect(spies.updateTable).toHaveBeenCalledWith(
            schema.pointsTransactions,
        );
        expect(spies.updateSet).toHaveBeenCalledWith({ status: "cancelled" });

        const capturedWhere = spies.updateWhere.mock.calls[0][0];
        const { sql: renderedSql, params } = new PgDialect().sqlToQuery(
            capturedWhere,
        );
        expect(renderedSql).toContain("status");
        expect(params).toContain("pending");
    });
});
