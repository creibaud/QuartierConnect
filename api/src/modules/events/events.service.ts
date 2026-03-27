import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import {
    EVENT_REGISTRATIONS_COLLECTION,
    EVENT_SWIPES_COLLECTION,
    EVENTS_COLLECTION,
    type EventDocument,
    type EventRegistrationDocument,
    type EventSwipeDocument,
} from "src/database/mongodb/models/event.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import type { Neo4jDriver } from "src/database/neo4j/neo4j.type";
import { CreateEventDto } from "src/modules/events/dto/create-event.dto";
import { EventQueryDto } from "src/modules/events/dto/event-query.dto";
import { SwipeEventDto } from "src/modules/events/dto/swipe-event.dto";
import { UpdateEventDto } from "src/modules/events/dto/update-event.dto";

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        @Inject("NEO4J") private readonly neo4j: Neo4jDriver,
    ) {}

    async create(creatorId: string, dto: CreateEventDto) {
        const now = new Date();
        const document: EventDocument = {
            quartierId: dto.quartierId,
            creatorId,
            title: dto.title,
            description: dto.description,
            category: dto.category,
            startDate: new Date(dto.startDate),
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            location: dto.location,
            locationName: dto.locationName,
            maxCapacity: dto.maxCapacity,
            imageUrl: dto.imageUrl,
            registrationCount: 0,
            createdAt: now,
            updatedAt: now,
        };

        const result = await this.mongo
            .collection<EventDocument>(EVENTS_COLLECTION)
            .insertOne(document);

        const id = result.insertedId.toString();

        const session = this.neo4j.session();
        try {
            await session.run(
                `CREATE (e:Event {id: $id, title: $title, category: $category, startDate: $startDate, createdAt: $createdAt})`,
                {
                    id,
                    title: dto.title,
                    category: dto.category,
                    startDate: now.toISOString(),
                    createdAt: now.toISOString(),
                },
            );

            await session.run(
                `MATCH (u:User {id: $creatorId}), (e:Event {id: $id})
                 CREATE (u)-[:CREATED_EVENT]->(e)`,
                { creatorId, id },
            );
        } finally {
            await session.close();
        }

        this.logger.log(`Event created: ${id} by user ${creatorId}`);

        return { id, ...document };
    }

    async findAll(query: EventQueryDto, _userId: string) {
        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};

        if (query.category) {
            filter.category = query.category;
        }

        if (query.quartierId) {
            filter.quartierId = query.quartierId;
        }

        if (query.upcoming) {
            filter.startDate = { $gt: new Date() };
        }

        if (query.search) {
            filter.title = { $regex: query.search, $options: "i" };
        }

        const collection =
            this.mongo.collection<EventDocument>(EVENTS_COLLECTION);

        const [events, total] = await Promise.all([
            collection.find(filter).skip(skip).limit(limit).toArray(),
            collection.countDocuments(filter),
        ]);

        return {
            data: events.map(this.toEventResponse),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const event = await this.mongo
            .collection<EventDocument>(EVENTS_COLLECTION)
            .findOne({ _id: new ObjectId(id) });

        if (!event) {
            throw new NotFoundException("Event not found");
        }

        return this.toEventResponse(event);
    }

    async update(
        id: string,
        userId: string,
        userRole: string,
        dto: UpdateEventDto,
    ) {
        const event = await this.findOne(id);

        const isPrivileged = userRole === "admin" || userRole === "moderator";
        if (event.creatorId !== userId && !isPrivileged) {
            throw new ForbiddenException(
                "You are not allowed to update this event",
            );
        }

        const now = new Date();
        const { startDate, endDate, ...rest } = dto;
        await this.mongo.collection<EventDocument>(EVENTS_COLLECTION).updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    ...rest,
                    ...(startDate ? { startDate: new Date(startDate) } : {}),
                    ...(endDate ? { endDate: new Date(endDate) } : {}),
                    updatedAt: now,
                },
            },
        );

        if (dto.title) {
            const session = this.neo4j.session();
            try {
                await session.run(
                    `MATCH (e:Event {id: $id}) SET e.title = $title`,
                    { id, title: dto.title },
                );
            } finally {
                await session.close();
            }
        }

        this.logger.log(`Event updated: ${id} by user ${userId}`);

        return this.findOne(id);
    }

    async delete(id: string, userId: string, userRole: string) {
        const event = await this.findOne(id);

        const isPrivileged = userRole === "admin" || userRole === "moderator";
        if (event.creatorId !== userId && !isPrivileged) {
            throw new ForbiddenException(
                "You are not allowed to delete this event",
            );
        }

        await this.mongo
            .collection<EventDocument>(EVENTS_COLLECTION)
            .deleteOne({ _id: new ObjectId(id) });

        const session = this.neo4j.session();
        try {
            await session.run(`MATCH (e:Event {id: $id}) DETACH DELETE e`, {
                id,
            });
        } finally {
            await session.close();
        }

        this.logger.log(`Event deleted: ${id} by user ${userId}`);
    }

    async register(eventId: string, userId: string) {
        const event = await this.findOne(eventId);

        if (
            event.maxCapacity !== undefined &&
            event.registrationCount >= event.maxCapacity
        ) {
            throw new BadRequestException(
                "Event has reached its maximum capacity",
            );
        }

        const existingRegistration = await this.mongo
            .collection<EventRegistrationDocument>(
                EVENT_REGISTRATIONS_COLLECTION,
            )
            .findOne({ eventId, userId, status: { $ne: "cancelled" } });

        if (existingRegistration) {
            throw new ConflictException(
                "You are already registered for this event",
            );
        }

        const now = new Date();
        await this.mongo
            .collection<EventRegistrationDocument>(
                EVENT_REGISTRATIONS_COLLECTION,
            )
            .insertOne({
                eventId,
                userId,
                status: "registered",
                registeredAt: now,
            });

        await this.mongo
            .collection<EventDocument>(EVENTS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(eventId) },
                { $inc: { registrationCount: 1 } },
            );

        const session = this.neo4j.session();
        try {
            await session.run(
                `MERGE (u:User {id: $userId})-[r:PARTICIPATED_IN {registeredAt: $date}]->(e:Event {id: $eventId})`,
                { userId, eventId, date: now.toISOString() },
            );

            await session.run(
                `MATCH (creator:User)-[:CREATED_EVENT]->(e:Event {id: $eventId}), (participant:User {id: $userId})
                 MERGE (creator)-[k:KNOWS]->(participant)
                 ON CREATE SET k.weight = 1, k.since = $date
                 ON MATCH SET k.weight = k.weight + 0.5`,
                { eventId, userId, date: now.toISOString() },
            );
        } finally {
            await session.close();
        }

        this.logger.log(`User ${userId} registered for event ${eventId}`);
    }

    async cancelRegistration(eventId: string, userId: string) {
        await this.mongo
            .collection<EventRegistrationDocument>(
                EVENT_REGISTRATIONS_COLLECTION,
            )
            .updateOne(
                { eventId, userId, status: "registered" },
                { $set: { status: "cancelled" } },
            );

        await this.mongo
            .collection<EventDocument>(EVENTS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(eventId) },
                { $inc: { registrationCount: -1 } },
            );

        const session = this.neo4j.session();
        try {
            await session.run(
                `MATCH (u:User {id: $userId})-[r:PARTICIPATED_IN]->(e:Event {id: $eventId}) DELETE r`,
                { userId, eventId },
            );
        } finally {
            await session.close();
        }

        this.logger.log(
            `User ${userId} cancelled registration for event ${eventId}`,
        );
    }

    async getRegistrations(eventId: string, query: PaginationQueryDto) {
        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const collection = this.mongo.collection<EventRegistrationDocument>(
            EVENT_REGISTRATIONS_COLLECTION,
        );

        const [registrations, total] = await Promise.all([
            collection.find({ eventId }).skip(skip).limit(limit).toArray(),
            collection.countDocuments({ eventId }),
        ]);

        return {
            data: registrations.map((reg) => ({
                ...reg,
                id: reg._id?.toString(),
                _id: undefined,
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async swipe(userId: string, dto: SwipeEventDto) {
        const now = new Date();

        await this.mongo
            .collection<EventSwipeDocument>(EVENT_SWIPES_COLLECTION)
            .updateOne(
                { eventId: dto.eventId, userId },
                { $set: { liked: dto.liked, swipedAt: now } },
                { upsert: true },
            );

        if (!dto.liked) {
            this.logger.log(`User ${userId} disliked event ${dto.eventId}`);
            return;
        }

        const session = this.neo4j.session();
        try {
            await session.run(
                `MERGE (u:User {id: $userId})-[r:INTERESTED_IN]->(e:Event {id: $eventId})
                 ON CREATE SET r.score = 1, r.updatedAt = $date
                 ON MATCH SET r.score = r.score + 1, r.updatedAt = $date`,
                { userId, eventId: dto.eventId, date: now.toISOString() },
            );

            await session.run(
                `MATCH (e:Event {id: $eventId})
                 MERGE (u:User {id: $userId})-[r:INTERESTED_IN_CATEGORY]->(c:Category {name: e.category})
                 ON CREATE SET r.score = 1, r.updatedAt = $date
                 ON MATCH SET r.score = r.score + 1, r.updatedAt = $date`,
                { userId, eventId: dto.eventId, date: now.toISOString() },
            );
        } finally {
            await session.close();
        }

        this.logger.log(`User ${userId} liked event ${dto.eventId}`);
    }

    async getNextSwipe(userId: string, quartierId: string) {
        const swipedEvents = await this.mongo
            .collection<EventSwipeDocument>(EVENT_SWIPES_COLLECTION)
            .find({ userId })
            .toArray();

        const swipedEventIds = swipedEvents.map((s) => s.eventId);

        const registrations = await this.mongo
            .collection<EventRegistrationDocument>(
                EVENT_REGISTRATIONS_COLLECTION,
            )
            .find({ userId, status: "registered" })
            .toArray();

        const registeredEventIds = registrations.map((r) => r.eventId);

        const excludedIds = [...swipedEventIds, ...registeredEventIds];

        const filter: Record<string, unknown> = {
            quartierId,
            startDate: { $gt: new Date() },
        };

        if (excludedIds.length > 0) {
            filter._id = { $nin: excludedIds.map((id) => new ObjectId(id)) };
        }

        const event = await this.mongo
            .collection<EventDocument>(EVENTS_COLLECTION)
            .findOne(filter);

        if (!event) {
            return null;
        }

        return this.toEventResponse(event);
    }

    private toEventResponse(event: EventDocument & { _id?: ObjectId }) {
        const { _id, ...rest } = event;
        return { id: _id?.toString(), ...rest };
    }
}
