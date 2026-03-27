import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";
import { CreateEventDto } from "src/modules/events/dto/create-event.dto";
import { SwipeEventDto } from "src/modules/events/dto/swipe-event.dto";
import { UpdateEventDto } from "src/modules/events/dto/update-event.dto";
import { EventsService } from "src/modules/events/events.service";

const makeObjectId = () => new ObjectId();

const buildEventDocument = (overrides = {}) => ({
    _id: makeObjectId(),
    quartierId: "quartier-uuid",
    creatorId: "creator-user-id",
    title: "Test Event",
    category: "social" as const,
    startDate: new Date(Date.now() + 86_400_000),
    registrationCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const buildCollectionMock = () => ({
    insertOne: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
    }),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
});

describe("EventsService", () => {
    let service: EventsService;
    let collectionMocks: Record<string, ReturnType<typeof buildCollectionMock>>;
    let sessionRunMock: jest.Mock;
    let sessionCloseMock: jest.Mock;
    let mongo: MongoDatabase;
    let neo4j: Neo4jDriver;

    beforeEach(() => {
        jest.clearAllMocks();

        collectionMocks = {};

        sessionRunMock = jest.fn().mockResolvedValue({});
        sessionCloseMock = jest.fn().mockResolvedValue(undefined);

        mongo = {
            collection: jest.fn().mockImplementation((name: string) => {
                if (!collectionMocks[name]) {
                    collectionMocks[name] = buildCollectionMock();
                }
                return collectionMocks[name];
            }),
        } as unknown as MongoDatabase;

        neo4j = {
            session: jest.fn().mockReturnValue({
                run: sessionRunMock,
                close: sessionCloseMock,
            }),
        } as unknown as Neo4jDriver;

        service = new EventsService(mongo, neo4j);
    });

    describe("create", () => {
        const dto: CreateEventDto = {
            title: "Neighborhood Picnic",
            category: "social",
            startDate: new Date(Date.now() + 86_400_000).toISOString(),
            quartierId: "quartier-uuid",
        };

        it("inserts a document into MongoDB and creates Neo4j nodes", async () => {
            const insertedId = makeObjectId();
            const eventsCollection = buildCollectionMock();
            eventsCollection.insertOne.mockResolvedValue({ insertedId });
            (mongo.collection as jest.Mock).mockReturnValue(eventsCollection);

            const result = await service.create("creator-user-id", dto);

            expect(eventsCollection.insertOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: dto.title,
                    category: dto.category,
                    creatorId: "creator-user-id",
                    registrationCount: 0,
                }),
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("CREATE (e:Event"),
                expect.objectContaining({ id: insertedId.toString() }),
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("CREATED_EVENT"),
                expect.objectContaining({ creatorId: "creator-user-id" }),
            );

            expect(result.id).toBe(insertedId.toString());
            expect(sessionCloseMock).toHaveBeenCalled();
        });
    });

    describe("findOne", () => {
        it("returns the event when found", async () => {
            const eventDoc = buildEventDocument();
            const eventsCollection = buildCollectionMock();
            eventsCollection.findOne.mockResolvedValue(eventDoc);
            (mongo.collection as jest.Mock).mockReturnValue(eventsCollection);

            const result = await service.findOne(eventDoc._id.toString());

            expect(result.id).toBe(eventDoc._id.toString());
            expect(result.title).toBe(eventDoc.title);
        });

        it("throws NotFoundException when event does not exist", async () => {
            const eventsCollection = buildCollectionMock();
            eventsCollection.findOne.mockResolvedValue(null);
            (mongo.collection as jest.Mock).mockReturnValue(eventsCollection);

            await expect(
                service.findOne(makeObjectId().toString()),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe("register", () => {
        it("registers a user and creates Neo4j relationships", async () => {
            const eventId = makeObjectId().toString();
            const eventDoc = buildEventDocument({ _id: new ObjectId(eventId) });

            (mongo.collection as jest.Mock).mockImplementation(
                (name: string) => {
                    if (!collectionMocks[name]) {
                        collectionMocks[name] = buildCollectionMock();
                    }
                    if (name === "events") {
                        collectionMocks[name].findOne.mockResolvedValue(
                            eventDoc,
                        );
                    }
                    if (name === "event_registrations") {
                        collectionMocks[name].findOne.mockResolvedValue(null);
                    }
                    return collectionMocks[name];
                },
            );

            await service.register(eventId, "user-id");

            expect(
                collectionMocks["event_registrations"].insertOne,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId,
                    userId: "user-id",
                    status: "registered",
                }),
            );

            expect(collectionMocks["events"].updateOne).toHaveBeenCalledWith(
                expect.anything(),
                { $inc: { registrationCount: 1 } },
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("PARTICIPATED_IN"),
                expect.objectContaining({ userId: "user-id", eventId }),
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("KNOWS"),
                expect.objectContaining({ eventId, userId: "user-id" }),
            );
        });

        it("throws BadRequestException when event is at full capacity", async () => {
            const eventId = makeObjectId().toString();
            const eventDoc = buildEventDocument({
                _id: new ObjectId(eventId),
                maxCapacity: 10,
                registrationCount: 10,
            });

            (mongo.collection as jest.Mock).mockImplementation(
                (name: string) => {
                    if (!collectionMocks[name]) {
                        collectionMocks[name] = buildCollectionMock();
                    }
                    if (name === "events") {
                        collectionMocks[name].findOne.mockResolvedValue(
                            eventDoc,
                        );
                    }
                    return collectionMocks[name];
                },
            );

            await expect(
                service.register(eventId, "user-id"),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("throws ConflictException when user is already registered", async () => {
            const eventId = makeObjectId().toString();
            const eventDoc = buildEventDocument({ _id: new ObjectId(eventId) });

            (mongo.collection as jest.Mock).mockImplementation(
                (name: string) => {
                    if (!collectionMocks[name]) {
                        collectionMocks[name] = buildCollectionMock();
                    }
                    if (name === "events") {
                        collectionMocks[name].findOne.mockResolvedValue(
                            eventDoc,
                        );
                    }
                    if (name === "event_registrations") {
                        collectionMocks[name].findOne.mockResolvedValue({
                            eventId,
                            userId: "user-id",
                            status: "registered",
                        });
                    }
                    return collectionMocks[name];
                },
            );

            await expect(
                service.register(eventId, "user-id"),
            ).rejects.toBeInstanceOf(ConflictException);
        });
    });

    describe("swipe", () => {
        it("creates Neo4j INTERESTED_IN relationships when liked is true", async () => {
            const dto: SwipeEventDto = {
                eventId: makeObjectId().toString(),
                liked: true,
            };

            const swipesCollection = buildCollectionMock();
            (mongo.collection as jest.Mock).mockReturnValue(swipesCollection);

            await service.swipe("user-id", dto);

            expect(swipesCollection.updateOne).toHaveBeenCalledWith(
                { eventId: dto.eventId, userId: "user-id" },
                expect.anything(),
                { upsert: true },
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("INTERESTED_IN"),
                expect.objectContaining({
                    userId: "user-id",
                    eventId: dto.eventId,
                }),
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("INTERESTED_IN_CATEGORY"),
                expect.objectContaining({
                    userId: "user-id",
                    eventId: dto.eventId,
                }),
            );
        });

        it("does not create Neo4j relationships when liked is false", async () => {
            const dto: SwipeEventDto = {
                eventId: makeObjectId().toString(),
                liked: false,
            };

            const swipesCollection = buildCollectionMock();
            (mongo.collection as jest.Mock).mockReturnValue(swipesCollection);

            await service.swipe("user-id", dto);

            expect(swipesCollection.updateOne).toHaveBeenCalled();
            expect(sessionRunMock).not.toHaveBeenCalled();
        });
    });

    describe("cancelRegistration", () => {
        it("updates registration status and removes Neo4j relationship", async () => {
            const eventId = makeObjectId().toString();

            (mongo.collection as jest.Mock).mockImplementation(
                (name: string) => {
                    if (!collectionMocks[name]) {
                        collectionMocks[name] = buildCollectionMock();
                    }
                    return collectionMocks[name];
                },
            );

            await service.cancelRegistration(eventId, "user-id");

            expect(
                collectionMocks["event_registrations"].updateOne,
            ).toHaveBeenCalledWith(
                { eventId, userId: "user-id", status: "registered" },
                { $set: { status: "cancelled" } },
            );

            expect(collectionMocks["events"].updateOne).toHaveBeenCalledWith(
                expect.anything(),
                { $inc: { registrationCount: -1 } },
            );

            expect(sessionRunMock).toHaveBeenCalledWith(
                expect.stringContaining("DELETE r"),
                expect.objectContaining({ userId: "user-id", eventId }),
            );
        });
    });

    describe("update", () => {
        it("throws ForbiddenException when user is not creator and not admin/moderator", async () => {
            const eventId = makeObjectId().toString();
            const eventDoc = buildEventDocument({
                _id: new ObjectId(eventId),
                creatorId: "other-user-id",
            });

            const eventsCollection = buildCollectionMock();
            eventsCollection.findOne.mockResolvedValue(eventDoc);
            (mongo.collection as jest.Mock).mockReturnValue(eventsCollection);

            const dto: UpdateEventDto = { title: "Updated Title" };

            await expect(
                service.update(eventId, "user-id", "resident", dto),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it("allows admin to update any event", async () => {
            const eventId = makeObjectId().toString();
            const eventDoc = buildEventDocument({
                _id: new ObjectId(eventId),
                creatorId: "other-user-id",
            });

            (mongo.collection as jest.Mock).mockImplementation(
                (name: string) => {
                    if (!collectionMocks[name]) {
                        collectionMocks[name] = buildCollectionMock();
                    }
                    collectionMocks[name].findOne.mockResolvedValue(eventDoc);
                    return collectionMocks[name];
                },
            );

            const dto: UpdateEventDto = { title: "Admin Updated Title" };

            await expect(
                service.update(eventId, "admin-user-id", "admin", dto),
            ).resolves.toBeDefined();
        });
    });
});
