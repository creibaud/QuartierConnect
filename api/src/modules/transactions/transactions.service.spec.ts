import { NotFoundException } from "@nestjs/common";
import { ObjectId } from "mongodb";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { TransactionsService } from "./transactions.service";

const TRANSACTION_ID = new ObjectId().toHexString();
const USER_ID = "user-uuid-1234";
const ADMIN_ID = "admin-uuid-5678";

const baseTransaction = {
    _id: new ObjectId(TRANSACTION_ID),
    fromUserId: ADMIN_ID,
    toUserId: USER_ID,
    type: "adjustment" as const,
    pointsAmount: 5,
    description: "Bonus points",
    createdAt: new Date(),
};

function buildMongoCursor(data: unknown[]) {
    return {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(data),
    };
}

describe("TransactionsService", () => {
    let service: TransactionsService;
    let mongo: jest.Mocked<MongoDatabase>;
    let db: jest.Mocked<DrizzleDB>;

    beforeEach(() => {
        jest.clearAllMocks();

        db = {
            select: jest.fn(),
            update: jest.fn(),
        } as unknown as jest.Mocked<DrizzleDB>;

        mongo = {
            collection: jest.fn(),
        } as unknown as jest.Mocked<MongoDatabase>;

        service = new TransactionsService(mongo, db);
    });

    describe("findMyHistory", () => {
        it("returns paginated transactions for the current user", async () => {
            const mockCollection = {
                find: jest
                    .fn()
                    .mockReturnValue(buildMongoCursor([baseTransaction])),
                countDocuments: jest.fn().mockResolvedValue(1),
            };
            mongo.collection = jest.fn().mockReturnValue(mockCollection);
            service = new TransactionsService(mongo, db);

            const result = await service.findMyHistory(USER_ID, {
                page: 1,
                limit: 10,
            });

            expect(result.meta.total).toBe(1);
            expect(result.data[0]).not.toHaveProperty("_id");
            expect(result.data[0]).toHaveProperty("id");
        });

        it("filters by transaction type when provided", async () => {
            const mockCollection = {
                find: jest
                    .fn()
                    .mockReturnValue(buildMongoCursor([baseTransaction])),
                countDocuments: jest.fn().mockResolvedValue(1),
            };
            mongo.collection = jest.fn().mockReturnValue(mockCollection);
            service = new TransactionsService(mongo, db);

            await service.findMyHistory(USER_ID, {
                page: 1,
                limit: 10,
                type: "adjustment",
            });

            const [filterArg] = mockCollection.find.mock.calls[0] as [
                Record<string, unknown>,
            ];
            expect(filterArg.type).toBe("adjustment");
        });

        it("returns empty result when no transactions found", async () => {
            const mockCollection = {
                find: jest.fn().mockReturnValue(buildMongoCursor([])),
                countDocuments: jest.fn().mockResolvedValue(0),
            };
            mongo.collection = jest.fn().mockReturnValue(mockCollection);
            service = new TransactionsService(mongo, db);

            const result = await service.findMyHistory(USER_ID, {});
            expect(result.data).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });
    });

    describe("createAdjustment", () => {
        it("inserts transaction and updates user balance", async () => {
            const insertOne = jest
                .fn()
                .mockResolvedValue({ insertedId: new ObjectId() });
            mongo.collection = jest.fn().mockReturnValue({ insertOne });

            const updateWhere = jest.fn().mockResolvedValue([]);
            const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
            db.update = jest.fn().mockReturnValue({ set: updateSet });

            service = new TransactionsService(mongo, db);

            const result = await service.createAdjustment(ADMIN_ID, {
                userId: USER_ID,
                pointsAmount: 5,
                description: "Bonus points",
            });

            expect(result.type).toBe("adjustment");
            expect(result.pointsAmount).toBe(5);
            expect(insertOne).toHaveBeenCalled();
        });

        it("supports negative adjustments", async () => {
            const insertOne = jest
                .fn()
                .mockResolvedValue({ insertedId: new ObjectId() });
            mongo.collection = jest.fn().mockReturnValue({ insertOne });

            const updateWhere = jest.fn().mockResolvedValue([]);
            const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
            db.update = jest.fn().mockReturnValue({ set: updateSet });

            service = new TransactionsService(mongo, db);

            const result = await service.createAdjustment(ADMIN_ID, {
                userId: USER_ID,
                pointsAmount: -3,
                description: "Penalty",
            });

            expect(result.pointsAmount).toBe(-3);
        });
    });

    describe("findOne", () => {
        it("throws NotFoundException when transaction not found", async () => {
            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(null),
            };
            mongo.collection = jest.fn().mockReturnValue(mockCollection);
            service = new TransactionsService(mongo, db);

            await expect(
                service.findOne(TRANSACTION_ID),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it("returns transaction when found", async () => {
            const mockCollection = {
                findOne: jest.fn().mockResolvedValue(baseTransaction),
            };
            mongo.collection = jest.fn().mockReturnValue(mockCollection);
            service = new TransactionsService(mongo, db);

            const result = await service.findOne(TRANSACTION_ID);
            expect(result.id).toBeTruthy();
            expect(result).not.toHaveProperty("_id");
        });
    });
});
