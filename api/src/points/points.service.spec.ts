import { BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { PointsService } from "./points.service";

function renderSql(query: unknown): { sql: string; params: unknown[] } {
    return new PgDialect().sqlToQuery(query as SQL);
}

function makePostgresError(code: string): Error {
    return Object.assign(new Error(`postgres error ${code}`), { code });
}

interface MockTerminal {
    then: (
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
    ) => Promise<unknown>;
    orderBy: jest.Mock;
    offset: jest.Mock;
    limit: jest.Mock;
    returning: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
}

function makeTerminal(rows: unknown[]): MockTerminal {
    const t: MockTerminal = {
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
        orderBy: jest.fn(),
        offset: jest.fn(),
        limit: jest.fn().mockResolvedValue(rows),
        returning: jest.fn().mockResolvedValue(rows),
        set: jest.fn(),
        where: jest.fn(),
    };
    t.orderBy.mockReturnValue(t);
    t.offset.mockReturnValue(t);
    t.set.mockReturnValue(t);
    t.where.mockReturnValue(t);
    return t;
}

function buildMockDb(rows: unknown[] = []): {
    db: any;
    terminal: MockTerminal;
} {
    const terminal = makeTerminal(rows);
    const db: any = {
        select: jest.fn(),
        from: jest.fn(),
        where: jest.fn(),
        update: jest.fn(),
        set: jest.fn(),
        insert: jest.fn(),
        values: jest.fn(),
        transaction: jest.fn(),
    };
    db.select.mockReturnValue(db);
    db.from.mockReturnValue(db);
    db.where.mockReturnValue(terminal);
    db.update.mockReturnValue(db);
    db.set.mockReturnValue(terminal);
    db.insert.mockReturnValue(db);
    db.values.mockReturnValue(terminal);
    return { db, terminal };
}

describe("PointsService", () => {
    let service: PointsService;
    let db: any;
    let mockTx: any;

    beforeEach(async () => {
        mockTx = {
            execute: jest.fn().mockImplementation((query: unknown) => {
                const { sql: rendered } = renderSql(query);
                if (rendered.includes("FROM users")) {
                    return Promise.resolve([
                        { id: "recv-id", role: "resident" },
                    ]);
                }
                return Promise.resolve([
                    { user_id: "recv-id", balance: 80 },
                    { user_id: "sender-id", balance: 100 },
                ]);
            }),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
            returning: jest
                .fn()
                .mockResolvedValue([
                    { id: "tx-1", senderId: "sender-id", amount: 20 },
                ]),
        };

        ({ db } = buildMockDb([
            { id: "bal-1", userId: "user-1", balance: 100 },
        ]));
        db.transaction = jest
            .fn()
            .mockImplementation((cb: any) => cb(mockTx) as unknown);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PointsService,
                { provide: DRIZZLE_TOKEN, useValue: db },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();

        service = module.get<PointsService>(PointsService);
    });

    describe("getBalance", () => {
        it("returns current balance for user", async () => {
            const t = makeTerminal([{ id: "bal-1", balance: 50 }]);
            db.where.mockReturnValue(t);
            const result = await service.getBalance("user-1");
            expect(result).toEqual({ balance: 50 });
        });

        it("returns 0 when no balance row exists", async () => {
            db.where.mockReturnValue(makeTerminal([]));
            const result = await service.getBalance("new-user");
            expect(result).toEqual({ balance: 0 });
        });
    });

    describe("getHistory", () => {
        it("returns paginated transactions", async () => {
            const t = makeTerminal([{ id: "tx-1", amount: 10 }]);
            db.where.mockReturnValue(t);
            const result = await service.getHistory("user-1", 1, 10);
            expect(result).toHaveLength(1);
        });

        it("uses default page=1 limit=20 when not provided", async () => {
            const t = makeTerminal([]);
            db.where.mockReturnValue(t);
            await service.getHistory("user-1");
            expect(t.offset).toHaveBeenCalledWith(0);
            expect(t.limit).toHaveBeenCalledWith(20);
        });

        it("returns both sent and received transactions", async () => {
            const sent = {
                id: "tx-1",
                senderId: "user-1",
                recipientId: "user-2",
                amount: 10,
            };
            const received = {
                id: "tx-2",
                senderId: "user-2",
                recipientId: "user-1",
                amount: 5,
            };
            const t = makeTerminal([sent, received]);
            db.where.mockReturnValue(t);
            const result = await service.getHistory("user-1", 1, 20);
            expect(result).toHaveLength(2);
            expect(result.some((tx: any) => tx.senderId === "user-1")).toBe(
                true,
            );
            expect(result.some((tx: any) => tx.recipientId === "user-1")).toBe(
                true,
            );
        });

        it("attaches sender and recipient emails to each transaction", async () => {
            const tx = {
                id: "tx-1",
                senderId: "user-1",
                recipientId: "user-2",
                amount: 10,
            };
            const txTerminal = makeTerminal([tx]);
            const usersTerminal = makeTerminal([
                { id: "user-1", email: "alice@demo.fr" },
                { id: "user-2", email: "bob@demo.fr" },
            ]);
            db.where
                .mockReturnValueOnce(txTerminal)
                .mockReturnValueOnce(usersTerminal);
            const result = await service.getHistory("user-1", 1, 20);
            expect(result[0].senderEmail).toBe("alice@demo.fr");
            expect(result[0].recipientEmail).toBe("bob@demo.fr");
        });
    });

    describe("transfer", () => {
        it("throws BadRequestException on self-transfer", async () => {
            await expect(
                service.transfer("user-1", {
                    recipientId: "user-1",
                    amount: 10,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("transfers points using SELECT FOR UPDATE in a transaction", async () => {
            await service.transfer("sender-id", {
                recipientId: "recv-id",
                amount: 20,
            });
            expect(db.transaction).toHaveBeenCalled();
            expect(mockTx.execute).toHaveBeenCalled();
            expect(mockTx.insert).toHaveBeenCalled();
        });

        it("returns the created transaction and both updated balances", async () => {
            const result = await service.transfer("sender-id", {
                recipientId: "recv-id",
                amount: 20,
            });
            expect(result.transaction).toEqual(
                expect.objectContaining({ id: "tx-1" }),
            );
            expect(result.senderBalance).toBe(80);
            expect(result.recipientBalance).toBe(100);
        });

        it("throws BadRequestException when the recipient does not exist", async () => {
            mockTx.execute.mockResolvedValueOnce([]);
            await expect(
                service.transfer("sender-id", {
                    recipientId: "ghost-id",
                    amount: 10,
                }),
            ).rejects.toThrow("Recipient does not exist");
            expect(mockTx.insert).not.toHaveBeenCalled();
        });

        it("throws BadRequestException when the recipient is banned", async () => {
            mockTx.execute.mockResolvedValueOnce([
                { id: "recv-id", role: "banned" },
            ]);
            await expect(
                service.transfer("sender-id", {
                    recipientId: "recv-id",
                    amount: 10,
                }),
            ).rejects.toThrow("Recipient does not exist");
            expect(mockTx.insert).not.toHaveBeenCalled();
        });

        it("throws BadRequestException when the locked sender balance would go below -10", async () => {
            mockTx.execute
                .mockResolvedValueOnce([{ id: "recv-id", role: "resident" }])
                .mockResolvedValueOnce([
                    { user_id: "sender-id", balance: 5 },
                    { user_id: "recv-id", balance: 0 },
                ]);
            const error = await service
                .transfer("sender-id", { recipientId: "recv-id", amount: 20 })
                .catch((e: unknown) => e);
            expect(error).toBeInstanceOf(BadRequestException);
            expect((error as BadRequestException).getResponse()).toMatchObject({
                code: "INSUFFICIENT_BALANCE",
                message: "Insufficient balance for this transfer",
            });
            expect(mockTx.update).not.toHaveBeenCalled();
        });

        it("treats missing balance row as 0 and rejects when amount exceeds limit", async () => {
            mockTx.execute
                .mockResolvedValueOnce([{ id: "recv-id", role: "resident" }])
                .mockResolvedValueOnce([]);
            const error = await service
                .transfer("sender-id", { recipientId: "recv-id", amount: 100 })
                .catch((e: unknown) => e);
            expect(error).toBeInstanceOf(BadRequestException);
            expect((error as BadRequestException).getResponse()).toMatchObject({
                code: "INSUFFICIENT_BALANCE",
            });
        });
    });

    describe("transfer concurrency", () => {
        it("locks both balance rows sorted by user_id with FOR UPDATE, inserting them first", async () => {
            await service.transfer("sender-id", {
                recipientId: "recv-id",
                amount: 20,
            });

            expect(mockTx.values).toHaveBeenNthCalledWith(1, [
                { userId: "recv-id", balance: 0 },
                { userId: "sender-id", balance: 0 },
            ]);
            const { sql: renderedSql, params } = renderSql(
                mockTx.execute.mock.calls[1][0],
            );
            expect(renderedSql).toContain("IN (");
            expect(renderedSql).toContain("ORDER BY user_id");
            expect(renderedSql).toContain("FOR UPDATE");
            expect(params).toEqual(["recv-id", "sender-id"]);
            expect(
                mockTx.onConflictDoNothing.mock.invocationCallOrder[0],
            ).toBeLessThan(mockTx.execute.mock.invocationCallOrder[1]);
        });

        it("maps a Postgres deadlock (40P01) raised in the transaction to CONCURRENT_UPDATE", async () => {
            mockTx.execute
                .mockResolvedValueOnce([{ id: "recv-id", role: "resident" }])
                .mockRejectedValueOnce(makePostgresError("40P01"));
            const error = await service
                .transfer("sender-id", { recipientId: "recv-id", amount: 20 })
                .catch((e: unknown) => e);
            expect(error).toBeInstanceOf(BadRequestException);
            expect((error as BadRequestException).getResponse()).toMatchObject({
                code: "CONCURRENT_UPDATE",
                message: "Concurrent update detected, please retry",
            });
        });

        it("maps a balance CHECK violation (23514) raised in the transaction to INSUFFICIENT_BALANCE", async () => {
            mockTx.where.mockRejectedValueOnce(makePostgresError("23514"));
            const error = await service
                .transfer("sender-id", { recipientId: "recv-id", amount: 20 })
                .catch((e: unknown) => e);
            expect(error).toBeInstanceOf(BadRequestException);
            expect((error as BadRequestException).getResponse()).toMatchObject({
                code: "INSUFFICIENT_BALANCE",
                message: "Insufficient balance for this transfer",
            });
        });
    });

    describe("cancelServicePayment", () => {
        it("returns true when a pending payment was voided", async () => {
            const voided = makeTerminal([{ id: "txn-1" }]);
            db.set.mockReturnValue(voided);
            const result = await service.cancelServicePayment("contract-1");
            expect(result).toBe(true);
            expect(voided.returning).toHaveBeenCalled();
        });

        it("returns false when no pending payment matched", async () => {
            const nothingVoided = makeTerminal([]);
            db.set.mockReturnValue(nothingVoided);
            const result = await service.cancelServicePayment("contract-1");
            expect(result).toBe(false);
            expect(nothingVoided.returning).toHaveBeenCalled();
        });
    });
});
