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
import { CreateEventDto } from "src/modules/events/dto/create-event.dto";
import { EventQueryDto } from "src/modules/events/dto/event-query.dto";
import { SwipeEventDto } from "src/modules/events/dto/swipe-event.dto";
import { UpdateEventDto } from "src/modules/events/dto/update-event.dto";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        private readonly outbox: OutboxService,
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

        await this.outbox.publish({
            aggregateType: "event",
            aggregateId: id,
            eventType: OUTBOX_EVENT_TYPES.eventCreated,
            payload: {
                id,
                creatorId,
                quartierId: dto.quartierId,
                title: dto.title,
                category: dto.category,
                startDate: document.startDate,
                createdAt: now,
            },
        });

        this.logger.log(`Event created: ${id} by user ${creatorId}`);

        return { id, ...document };
    }

    async findAll(query: EventQueryDto, userId: string) {
        void userId;
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
            data: events.map((event) => this.toEventResponse(event)),
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

        await this.outbox.publish({
            aggregateType: "event",
            aggregateId: id,
            eventType: OUTBOX_EVENT_TYPES.eventUpdated,
            payload: {
                id,
                updatedBy: userId,
                title: dto.title,
                category: dto.category,
                startDate: dto.startDate,
                updatedAt: now,
            },
        });

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

        await this.outbox.publish({
            aggregateType: "event",
            aggregateId: id,
            eventType: OUTBOX_EVENT_TYPES.eventDeleted,
            payload: {
                id,
                deletedBy: userId,
                deletedAt: new Date(),
            },
        });

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

        await this.outbox.publish({
            aggregateType: "event_registration",
            aggregateId: `${eventId}:${userId}`,
            eventType: OUTBOX_EVENT_TYPES.eventRegistrationCreated,
            payload: {
                eventId,
                userId,
                createdAt: now,
            },
        });

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

        await this.outbox.publish({
            aggregateType: "event_registration",
            aggregateId: `${eventId}:${userId}`,
            eventType: OUTBOX_EVENT_TYPES.eventRegistrationCancelled,
            payload: {
                eventId,
                userId,
                cancelledAt: new Date(),
            },
        });

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

        await this.outbox.publish({
            aggregateType: "event_swipe",
            aggregateId: `${dto.eventId}:${userId}`,
            eventType: OUTBOX_EVENT_TYPES.eventSwipeLiked,
            payload: {
                eventId: dto.eventId,
                userId,
                liked: true,
                swipedAt: now,
            },
        });

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
