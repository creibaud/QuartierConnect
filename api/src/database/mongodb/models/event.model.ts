import type { ObjectId } from "mongodb";
import type { GeoJsonPoint } from "./geojson.model";

export const EVENTS_COLLECTION = "events";
export const EVENT_REGISTRATIONS_COLLECTION = "event_registrations";
export const EVENT_SWIPES_COLLECTION = "event_swipes";

export type EventCategory =
    | "social"
    | "sport"
    | "cultural"
    | "educational"
    | "professional"
    | "family"
    | "other";

export type EventDocument = {
    _id?: ObjectId;
    quartierId: string;
    creatorId: string;
    title: string;
    description?: string;
    category: EventCategory;
    startDate: Date;
    endDate?: Date;
    location?: GeoJsonPoint;
    locationName?: string;
    maxCapacity?: number;
    imageUrl?: string;
    registrationCount: number;
    createdAt: Date;
    updatedAt: Date;
};

export type EventRegistrationDocument = {
    _id?: ObjectId;
    eventId: string;
    userId: string;
    status: "registered" | "cancelled" | "attended";
    registeredAt: Date;
};

export type EventSwipeDocument = {
    _id?: ObjectId;
    eventId: string;
    userId: string;
    liked: boolean;
    swipedAt: Date;
};
