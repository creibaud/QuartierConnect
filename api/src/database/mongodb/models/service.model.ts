import type { ObjectId } from "mongodb";

export const SERVICES_COLLECTION = "services";
export const SERVICE_RATINGS_COLLECTION = "service_ratings";

export type ServiceCategory =
    | "gardening"
    | "repair"
    | "cleaning"
    | "babysitting"
    | "tutoring"
    | "delivery"
    | "moving"
    | "cooking"
    | "other";

export type ServiceDocument = {
    _id?: ObjectId;
    quartierId: string;
    creatorId: string;
    acceptorId?: string;
    title: string;
    description?: string;
    category: ServiceCategory;
    type: "free" | "paid";
    estimatedDurationMinutes: number;
    pointsValue: number;
    status: "open" | "accepted" | "completed" | "cancelled";
    contractDocumentId?: string;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};

export type ServiceRatingDocument = {
    _id?: ObjectId;
    serviceId: string;
    raterUserId: string;
    rating: number;
    comment?: string;
    createdAt: Date;
};
