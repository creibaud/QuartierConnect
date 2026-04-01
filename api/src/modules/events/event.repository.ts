import type { ObjectId } from "mongodb";
import type {
    EventDocument,
    EventRegistrationDocument,
    EventSwipeDocument,
} from "src/database/mongodb/models/event.model";
import {
    EVENT_REGISTRATIONS_COLLECTION,
    EVENT_SWIPES_COLLECTION,
    EVENTS_COLLECTION,
} from "src/database/mongodb/models/event.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

export interface IEventsRepository {
    // CRUD
    create(
        eventData: Omit<EventDocument, "_id" | "createdAt" | "updatedAt">,
    ): Promise<EventDocument>;
    findById(id: ObjectId | string): Promise<EventDocument | null>;
    findAll(query: {
        page: number;
        limit: number;
        quartierId?: string;
        category?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{ data: EventDocument[]; total: number }>;
    update(
        id: ObjectId | string,
        eventData: Partial<EventDocument>,
    ): Promise<EventDocument | null>;
    delete(id: ObjectId | string): Promise<boolean>;

    // Registrations
    registerUser(
        eventId: ObjectId | string,
        userId: string,
    ): Promise<EventRegistrationDocument>;
    cancelRegistration(
        eventId: ObjectId | string,
        userId: string,
    ): Promise<boolean>;
    getRegistrations(
        eventId: ObjectId | string,
        page: number,
        limit: number,
    ): Promise<{
        data: EventRegistrationDocument[];
        total: number;
    }>;
    getRegistrationCount(eventId: ObjectId | string): Promise<number>;

    // Swipes (recommendations)
    getNextSwipe(userId: string, size: number): Promise<EventDocument[]>;
    recordSwipe(
        eventId: ObjectId | string,
        userId: string,
        action: "like" | "pass",
    ): Promise<EventSwipeDocument>;
    hasUserSwiped(eventId: ObjectId | string, userId: string): Promise<boolean>;
}

/**
 * EventRepository - MongoDB abstraction for Events
 * Handles all event-related database operations
 */
export class EventRepository implements IEventsRepository {
    private readonly collection = EVENTS_COLLECTION;
    private readonly registrationsCollection = EVENT_REGISTRATIONS_COLLECTION;
    private readonly swipesCollection = EVENT_SWIPES_COLLECTION;

    constructor(private readonly mongo: MongoDatabase) {}

    async create(
        eventData: Omit<EventDocument, "_id" | "createdAt" | "updatedAt">,
    ): Promise<EventDocument> {
        const document: EventDocument = {
            _id: new (require("mongodb").ObjectId)(),
            ...eventData,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.mongo.collection(this.collection).insertOne(document);
        return document;
    }

    async findById(id: ObjectId | string): Promise<EventDocument | null> {
        const { ObjectId } = require("mongodb");
        const objectId = typeof id === "string" ? new ObjectId(id) : id;
        return this.mongo
            .collection(this.collection)
            .findOne({ _id: objectId });
    }

    async findAll(query: {
        page: number;
        limit: number;
        quartierId?: string;
        category?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<{ data: EventDocument[]; total: number }> {
        const {
            page = 1,
            limit = 10,
            quartierId,
            category,
            search,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = query;
        const offset = (page - 1) * limit;

        const filter: Record<string, any> = {};
        if (quartierId) filter.quartierId = quartierId;
        if (category) filter.category = category;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const collection = this.mongo.collection(this.collection);
        const [data, total] = await Promise.all([
            collection
                .find(filter)
                .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
                .skip(offset)
                .limit(limit)
                .toArray() as Promise<EventDocument[]>,
            collection.countDocuments(filter),
        ]);

        return { data, total };
    }

    async update(
        id: ObjectId | string,
        eventData: Partial<EventDocument>,
    ): Promise<EventDocument | null> {
        const { ObjectId } = require("mongodb");
        const objectId = typeof id === "string" ? new ObjectId(id) : id;
        const result = await this.mongo
            .collection(this.collection)
            .findOneAndUpdate(
                { _id: objectId },
                {
                    $set: {
                        ...eventData,
                        updatedAt: new Date(),
                    },
                },
                { returnDocument: "after" },
            );
        return result.value || null;
    }

    async delete(id: ObjectId | string): Promise<boolean> {
        const { ObjectId } = require("mongodb");
        const objectId = typeof id === "string" ? new ObjectId(id) : id;
        const result = await this.mongo
            .collection(this.collection)
            .deleteOne({ _id: objectId });
        return result.deletedCount > 0;
    }

    async registerUser(
        eventId: ObjectId | string,
        userId: string,
    ): Promise<EventRegistrationDocument> {
        const { ObjectId } = require("mongodb");
        const eventObjectId =
            typeof eventId === "string" ? new ObjectId(eventId) : eventId;

        const registration: EventRegistrationDocument = {
            _id: new ObjectId(),
            eventId: eventObjectId,
            userId,
            registeredAt: new Date(),
            status: "registered",
        };

        await this.mongo
            .collection(this.registrationsCollection)
            .insertOne(registration);
        return registration;
    }

    async cancelRegistration(
        eventId: ObjectId | string,
        userId: string,
    ): Promise<boolean> {
        const { ObjectId } = require("mongodb");
        const eventObjectId =
            typeof eventId === "string" ? new ObjectId(eventId) : eventId;

        const result = await this.mongo
            .collection(this.registrationsCollection)
            .deleteOne({
                eventId: eventObjectId,
                userId,
            });

        return result.deletedCount > 0;
    }

    async getRegistrations(
        eventId: ObjectId | string,
        page: number,
        limit: number,
    ): Promise<{ data: EventRegistrationDocument[]; total: number }> {
        const { ObjectId } = require("mongodb");
        const eventObjectId =
            typeof eventId === "string" ? new ObjectId(eventId) : eventId;
        const offset = (page - 1) * limit;

        const filter = { eventId: eventObjectId };
        const collection = this.mongo.collection(this.registrationsCollection);

        const [data, total] = await Promise.all([
            collection
                .find(filter)
                .sort({ registeredAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray() as Promise<EventRegistrationDocument[]>,
            collection.countDocuments(filter),
        ]);

        return { data, total };
    }

    async getRegistrationCount(eventId: ObjectId | string): Promise<number> {
        const { ObjectId } = require("mongodb");
        const eventObjectId =
            typeof eventId === "string" ? new ObjectId(eventId) : eventId;
        return this.mongo
            .collection(this.registrationsCollection)
            .countDocuments({ eventId: eventObjectId });
    }

    async getNextSwipe(userId: string, size: number): Promise<EventDocument[]> {
        const collection = this.mongo.collection(this.collection);
        const swipesCollection = this.mongo.collection(this.swipesCollection);

        // Get swiped event IDs
        const swipedEvents = await swipesCollection
            .find({ userId })
            .project({ eventId: 1 })
            .toArray();
        const swipedEventIds = swipedEvents.map(
            (doc) => new (require("mongodb").ObjectId)(doc.eventId),
        );

        return collection
            .find({
                _id: { $nin: swipedEventIds },
                creatorId: { $ne: userId },
            })
            .limit(size)
            .toArray() as Promise<EventDocument[]>;
    }

    async recordSwipe(
        eventId: ObjectId | string,
        userId: string,
        action: "like" | "pass",
    ): Promise<EventSwipeDocument> {
        const { ObjectId } = require("mongodb");
        const eventObjectId =
            typeof eventId === "string" ? new ObjectId(eventId) : eventId;

        const swipe: EventSwipeDocument = {
            _id: new ObjectId(),
            eventId: eventObjectId,
            userId,
            action,
            swipedAt: new Date(),
        };

        await this.mongo.collection(this.swipesCollection).insertOne(swipe);
        return swipe;
    }

    async hasUserSwiped(
        eventId: ObjectId | string,
        userId: string,
    ): Promise<boolean> {
        const { ObjectId } = require("mongodb");
        const eventObjectId =
            typeof eventId === "string" ? new ObjectId(eventId) : eventId;

        const count = await this.mongo
            .collection(this.swipesCollection)
            .countDocuments({
                eventId: eventObjectId,
                userId,
            });

        return count > 0;
    }
}
