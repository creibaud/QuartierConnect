export const BOOKING_CREATED_EVENT = "booking.created";
export const BOOKING_ACCEPTED_EVENT = "booking.accepted";
export const BOOKING_DECLINED_EVENT = "booking.declined";
export const BOOKING_CANCELLED_EVENT = "booking.cancelled";
export const CONTRACT_SIGNED_EVENT = "contract.signed";
export const CONTRACT_FULLY_SIGNED_EVENT = "contract.fully_signed";
export const POINTS_SETTLED_EVENT = "points.settled";

export type NotificationType =
    | typeof BOOKING_CREATED_EVENT
    | typeof BOOKING_ACCEPTED_EVENT
    | typeof BOOKING_DECLINED_EVENT
    | typeof BOOKING_CANCELLED_EVENT
    | typeof CONTRACT_SIGNED_EVENT
    | typeof CONTRACT_FULLY_SIGNED_EVENT
    | typeof POINTS_SETTLED_EVENT;

export interface NotificationPayload {
    bookingId?: string;
    contractId?: string;
    serviceTitle?: string;
    amount?: number;
    actorName?: string;
}

export interface BookingLifecycleEvent {
    bookingId: string;
    ownerId: string;
    initiatorId: string;
    actorId: string;
    serviceTitle?: string;
    amount?: number;
    actorName?: string;
}

export interface ContractSignedEvent {
    contractId: string;
    signerId: string;
    signatories: string[];
    bookingId?: string;
    serviceTitle?: string;
    amount?: number;
    actorName?: string;
}

export interface ContractFullySignedEvent {
    contractId: string;
    bookingId: string;
    signatories?: string[];
    serviceTitle?: string;
    amount?: number;
    payerId?: string;
    payeeId?: string;
    serviceId?: string;
}

export interface PointsSettledEvent {
    contractId: string;
    payerId: string;
    payeeId: string;
    amount: number;
}
