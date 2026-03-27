import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";
import { ServicesService } from "./services.service";

const SERVICE_ID = new ObjectId().toHexString();

const baseService = {
    _id: new ObjectId(SERVICE_ID),
    id: SERVICE_ID,
    quartierId: "quartier-uuid",
    creatorId: "creator-uuid",
    title: "Garden help",
    category: "gardening" as const,
    type: "paid" as const,
    estimatedDurationMinutes: 60,
    pointsValue: 2,
    status: "open" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const acceptedService = {
    ...baseService,
    status: "accepted" as const,
    acceptorId: "acceptor-uuid",
};

const completedService = {
    ...acceptedService,
    status: "completed" as const,
    completedAt: new Date(),
};

function buildMongoCollection(
    overrides: Partial<{
        findOne: jest.Mock;
        insertOne: jest.Mock;
        updateOne: jest.Mock;
        deleteOne: jest.Mock;
        find: jest.Mock;
        countDocuments: jest.Mock;
    }> = {},
) {
    const defaultFindOne = jest.fn().mockResolvedValue(null);
    const defaultInsertOne = jest
        .fn()
        .mockResolvedValue({ insertedId: new ObjectId(SERVICE_ID) });
    const defaultUpdateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const defaultDeleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    const defaultCursor = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
    };
    const defaultFind = jest.fn().mockReturnValue(defaultCursor);
    const defaultCount = jest.fn().mockResolvedValue(0);

    return {
        findOne: overrides.findOne ?? defaultFindOne,
        insertOne: overrides.insertOne ?? defaultInsertOne,
        updateOne: overrides.updateOne ?? defaultUpdateOne,
        deleteOne: overrides.deleteOne ?? defaultDeleteOne,
        find: overrides.find ?? defaultFind,
        countDocuments: overrides.countDocuments ?? defaultCount,
    };
}

describe("ServicesService", () => {
    let service: ServicesService;
    let mongo: jest.Mocked<MongoDatabase>;
    let neo4j: jest.Mocked<Neo4jDriver>;
    let db: jest.Mocked<DrizzleDB>;

    const mockSession = {
        run: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        const collectionMock = buildMongoCollection();

        mongo = {
            collection: jest.fn().mockReturnValue(collectionMock),
        } as unknown as jest.Mocked<MongoDatabase>;

        neo4j = {
            session: jest.fn().mockReturnValue(mockSession),
        } as unknown as jest.Mocked<Neo4jDriver>;

        db = {
            select: jest.fn(),
            update: jest.fn(),
        } as unknown as jest.Mocked<DrizzleDB>;

        service = new ServicesService(mongo, neo4j, db);
    });

    describe("create", () => {
        it("calculates 1 point for duration < 60 minutes", async () => {
            await service.create("creator-uuid", {
                quartierId: "quartier-uuid",
                title: "Quick help",
                category: "cleaning",
                type: "free",
                estimatedDurationMinutes: 30,
            });

            const insertCall = (
                mongo.collection("services").insertOne as jest.Mock
            ).mock.calls[0][0];
            expect(insertCall.pointsValue).toBe(1);
        });

        it("calculates 2 points for duration >= 60 minutes", async () => {
            await service.create("creator-uuid", {
                quartierId: "quartier-uuid",
                title: "Long task",
                category: "repair",
                type: "paid",
                estimatedDurationMinutes: 60,
            });

            const insertCall = (
                mongo.collection("services").insertOne as jest.Mock
            ).mock.calls[0][0];
            expect(insertCall.pointsValue).toBe(2);
        });

        it("creates Neo4j relationships on service creation", async () => {
            await service.create("creator-uuid", {
                quartierId: "q-uuid",
                title: "Some service",
                category: "cooking",
                type: "free",
                estimatedDurationMinutes: 45,
            });

            expect(mockSession.run).toHaveBeenCalledWith(
                expect.stringContaining("CREATED_SERVICE"),
                expect.objectContaining({ creatorId: "creator-uuid" }),
            );
        });
    });

    describe("accept", () => {
        it("successfully accepts an open service", async () => {
            const findableMongo = {
                ...buildMongoCollection({
                    findOne: jest.fn().mockResolvedValue(baseService),
                }),
            };
            mongo.collection = jest.fn().mockReturnValue(findableMongo);
            service = new ServicesService(mongo, neo4j, db);

            const result = await service.accept(SERVICE_ID, "acceptor-uuid");
            expect(result.status).toBe("accepted");
            expect(result.acceptorId).toBe("acceptor-uuid");
        });

        it("throws BadRequestException when creator tries to accept own service", async () => {
            const findableMongo = {
                ...buildMongoCollection({
                    findOne: jest.fn().mockResolvedValue(baseService),
                }),
            };
            mongo.collection = jest.fn().mockReturnValue(findableMongo);
            service = new ServicesService(mongo, neo4j, db);

            await expect(
                service.accept(SERVICE_ID, "creator-uuid"),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe("complete (paid)", () => {
        it("transfers points when service type is paid", async () => {
            const findableMongo = {
                ...buildMongoCollection({
                    findOne: jest.fn().mockResolvedValue(acceptedService),
                }),
            };
            mongo.collection = jest.fn().mockReturnValue(findableMongo);

            const balanceSelect = {
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest
                            .fn()
                            .mockResolvedValue([{ balance: "10.00" }]),
                    }),
                }),
            };
            const updateChain = {
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([]),
                }),
            };
            db.select = jest.fn().mockReturnValue(balanceSelect);
            db.update = jest.fn().mockReturnValue(updateChain);

            service = new ServicesService(mongo, neo4j, db);

            const result = await service.complete(SERVICE_ID, "creator-uuid");
            expect(result.status).toBe("completed");
            expect(db.update).toHaveBeenCalledTimes(2);
        });

        it("throws BadRequestException when balance would fall below -10", async () => {
            const findableMongo = {
                ...buildMongoCollection({
                    findOne: jest.fn().mockResolvedValue(acceptedService),
                }),
            };
            mongo.collection = jest.fn().mockReturnValue(findableMongo);

            const balanceSelect = {
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest
                            .fn()
                            .mockResolvedValue([{ balance: "-9.00" }]),
                    }),
                }),
            };
            db.select = jest.fn().mockReturnValue(balanceSelect);

            service = new ServicesService(mongo, neo4j, db);

            await expect(
                service.complete(SERVICE_ID, "creator-uuid"),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("creates Neo4j COMPLETED_SERVICE_WITH relationship", async () => {
            const findableMongo = {
                ...buildMongoCollection({
                    findOne: jest.fn().mockResolvedValue(acceptedService),
                }),
            };
            mongo.collection = jest.fn().mockReturnValue(findableMongo);

            const balanceSelect = {
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest
                            .fn()
                            .mockResolvedValue([{ balance: "20.00" }]),
                    }),
                }),
            };
            const updateChain = {
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([]),
                }),
            };
            db.select = jest.fn().mockReturnValue(balanceSelect);
            db.update = jest.fn().mockReturnValue(updateChain);

            service = new ServicesService(mongo, neo4j, db);

            await service.complete(SERVICE_ID, "creator-uuid");

            expect(mockSession.run).toHaveBeenCalledWith(
                expect.stringContaining("COMPLETED_SERVICE_WITH"),
                expect.objectContaining({ serviceId: SERVICE_ID }),
            );
        });
    });

    describe("rate", () => {
        it("successfully rates a completed service", async () => {
            const collectionMocks: Record<
                string,
                ReturnType<typeof buildMongoCollection>
            > = {};

            mongo.collection = jest.fn().mockImplementation((name: string) => {
                if (!collectionMocks[name]) {
                    if (name === "services") {
                        collectionMocks[name] = buildMongoCollection({
                            findOne: jest
                                .fn()
                                .mockResolvedValue(completedService),
                        });
                    } else {
                        collectionMocks[name] = buildMongoCollection({
                            findOne: jest.fn().mockResolvedValue(null),
                        });
                    }
                }
                return collectionMocks[name];
            });

            service = new ServicesService(mongo, neo4j, db);

            const result = await service.rate(SERVICE_ID, "creator-uuid", {
                rating: 5,
                comment: "Great service!",
            });

            expect(result.rating).toBe(5);
        });

        it("throws ConflictException when user has already rated", async () => {
            const existingRating = {
                serviceId: SERVICE_ID,
                raterUserId: "creator-uuid",
                rating: 4,
            };
            const collectionMocks: Record<
                string,
                ReturnType<typeof buildMongoCollection>
            > = {};

            mongo.collection = jest.fn().mockImplementation((name: string) => {
                if (!collectionMocks[name]) {
                    if (name === "services") {
                        collectionMocks[name] = buildMongoCollection({
                            findOne: jest
                                .fn()
                                .mockResolvedValue(completedService),
                        });
                    } else {
                        collectionMocks[name] = buildMongoCollection({
                            findOne: jest
                                .fn()
                                .mockResolvedValue(existingRating),
                        });
                    }
                }
                return collectionMocks[name];
            });

            service = new ServicesService(mongo, neo4j, db);

            await expect(
                service.rate(SERVICE_ID, "creator-uuid", { rating: 3 }),
            ).rejects.toBeInstanceOf(ConflictException);
        });

        it("throws BadRequestException when service is not completed", async () => {
            const findableMongo = {
                ...buildMongoCollection({
                    findOne: jest.fn().mockResolvedValue(baseService),
                }),
            };
            mongo.collection = jest.fn().mockReturnValue(findableMongo);
            service = new ServicesService(mongo, neo4j, db);

            await expect(
                service.rate(SERVICE_ID, "creator-uuid", { rating: 4 }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("throws ForbiddenException when rater is not creator or acceptor", async () => {
            const collectionMocks: Record<
                string,
                ReturnType<typeof buildMongoCollection>
            > = {};

            mongo.collection = jest.fn().mockImplementation((name: string) => {
                if (!collectionMocks[name]) {
                    if (name === "services") {
                        collectionMocks[name] = buildMongoCollection({
                            findOne: jest
                                .fn()
                                .mockResolvedValue(completedService),
                        });
                    } else {
                        collectionMocks[name] = buildMongoCollection({
                            findOne: jest.fn().mockResolvedValue(null),
                        });
                    }
                }
                return collectionMocks[name];
            });

            service = new ServicesService(mongo, neo4j, db);

            await expect(
                service.rate(SERVICE_ID, "random-user-uuid", { rating: 3 }),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });
    });
});
