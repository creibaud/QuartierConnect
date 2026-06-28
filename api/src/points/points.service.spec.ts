import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { PointsService } from "./points.service";

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
            execute: jest
                .fn()
                .mockResolvedValue([{ id: "bal-1", balance: 100 }]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
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

        it("throws BadRequestException when balance would go below -10", async () => {
            mockTx.execute.mockResolvedValue([{ id: "bal-1", balance: 5 }]);
            await expect(
                service.transfer("sender-id", {
                    recipientId: "recv-id",
                    amount: 20,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("treats missing balance row as 0 and rejects when amount exceeds limit", async () => {
            mockTx.execute.mockResolvedValue([]);
            await expect(
                service.transfer("sender-id", {
                    recipientId: "recv-id",
                    amount: 100,
                }),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
