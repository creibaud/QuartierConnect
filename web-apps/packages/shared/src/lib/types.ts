export interface GeoJsonPoint {
    type: "Point";
    coordinates: [number, number];
}

export interface Incident {
    id: string;
    title: string;
    description: string | null;
    status: "open" | "in_progress" | "resolved";
    category: "neighborhood" | "reporting" | "bug";
    neighborhoodId: string | null;
    lat: number | null;
    lng: number | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: string;
    email: string;
    role: "resident" | "moderator" | "admin" | "banned";
    createdAt: string;
}

export interface GeoJsonPolygon {
    type: "Polygon";
    coordinates: number[][][];
}

export interface Neighborhood {
    _id: string;
    name: string;
    city: string;
    description?: string;
    geometry?: GeoJsonPolygon;
}

export interface ServiceResponder {
    userId: string;
    firstName: string | null;
    avatarUrl: string | null;
    createdAt: string;
}

export interface Service {
    _id: string;
    title: string;
    category: string;
    type: string;
    description: string;
    address?: string;
    neighborhoodId?: string;
    pointsMultiplier?: number;
    duration?: number;
    pointsAmount?: number | null;
    createdBy?: string;
    location?: GeoJsonPoint;
    direction: "offer" | "request";
    responderCount?: number;
    hasResponded?: boolean;
    responders?: ServiceResponder[];
}

export interface Event {
    _id: string;
    title: string;
    description: string;
    category: string;
    date: string;
    address?: string;
    location?: GeoJsonPoint;
    neighborhoodId: string;
    interestedUserIds?: string[];
}

export interface PointBalance {
    balance: number;
}

export type PointTransactionType = "bonus" | "service_payment";

export interface PointTransaction {
    id: string;
    senderId: string;
    recipientId: string;
    amount: number;
    note: string | null;
    type?: PointTransactionType;
    senderEmail: string | null;
    recipientEmail: string | null;
    senderName: string | null;
    recipientName: string | null;
    createdAt: string;
}

export interface TransferResult {
    transaction: PointTransaction;
    senderBalance: number;
    recipientBalance: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export type RecommendationReason =
    | "serviceInNeighborhood"
    | "upcomingEventNearby"
    | "sharedInterests"
    | "reliableNeighbor";

export interface Recommendation {
    type: "service" | "event" | "neighbor";
    id: string;
    name: string;
    score: number;
    reason: RecommendationReason;
}

export type SignatureZoneKind = "signature" | "initials";

/**
 * A signature/initials slot on an imported PDF page. Coordinates are
 * normalized to 0..1, relative to the page, with a top-left origin.
 */
export interface SignatureZone {
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
    signerId: string;
    kind: SignatureZoneKind;
}

export interface Contract {
    _id: string;
    title: string;
    content: string;
    createdBy: string;
    signatories: string[];
    status: "draft" | "partial" | "fully_signed" | "cancelled";
    contentHash: string | null;
    signedAt: string | null;
    signatures: Array<{ userId: string; signedAt: string; hash: string }>;
    serviceId?: string | null;
    bookingId?: string | null;
    pointsAmount?: number | null;
    pdfFileId?: string | null;
    source?: "generated" | "imported";
    zones?: SignatureZone[];
    createdAt: string;
    updatedAt: string;
}

export interface Conversation {
    _id: string;
    participants: string[];
    participantsInfo?: {
        id: string;
        email: string | null;
        name?: string | null;
    }[];
    isGroup: boolean;
    groupName: string | null;
    neighborhoodId: string | null;
    lastMessageAt: string | null;
    createdAt: string;
}

export interface Message {
    _id: string;
    conversationId: string;
    senderId: string;
    type: "text" | "file" | "image" | "audio";
    content: string | null;
    fileId: string | null;
    fileName: string | null;
    deleted: boolean;
    createdAt: string;
}

export interface VoteScore {
    score: number;
    breakdown: Record<string, number>;
}

export type VoteTargetType = "incident" | "service" | "event" | "comment";
export type VoteType = "like" | "dislike" | "up" | "down";

export interface MyProfile {
    id: string;
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
}

export interface UserExport {
    profile: {
        id: string;
        email: string;
        role: string;
        createdAt: string;
    } | null;
    incidents: Incident[];
    pointsBalance: PointBalance | null;
    transactions: unknown[];
}

export type BookingStatus =
    | "pending"
    | "accepted"
    | "declined"
    | "cancelled"
    | "completed";

export interface Booking {
    _id: string;
    serviceId: string;
    initiatorId: string;
    payerId: string;
    payeeId: string;
    pointsAmount: number;
    status: BookingStatus;
    contractId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ContractAuditEntry {
    action: "generated" | "imported" | "signed" | "viewed";
    userId: string;
    at: string;
    sha256?: string;
    fileId?: string;
}
