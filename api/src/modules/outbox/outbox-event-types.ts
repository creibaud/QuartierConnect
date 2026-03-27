export const OUTBOX_EVENT_TYPES = {
    userRegistered: "user.registered",
    userUpdated: "user.updated",
    userAnonymized: "user.anonymized",
    eventCreated: "event.created",
    eventUpdated: "event.updated",
    eventDeleted: "event.deleted",
    eventRegistrationCreated: "event.registration.created",
    eventRegistrationCancelled: "event.registration.cancelled",
    eventSwipeLiked: "event.swiped.liked",
    serviceCreated: "service.created",
    serviceUpdated: "service.updated",
    serviceDeleted: "service.deleted",
    serviceAccepted: "service.accepted",
    serviceCompleted: "service.completed",
    serviceCancelled: "service.cancelled",
    quartierCreated: "quartier.created",
    quartierNameUpdated: "quartier.name.updated",
    quartierDeleted: "quartier.deleted",
    quartierMemberAdded: "quartier.member.added",
    quartierMemberRemoved: "quartier.member.removed",
} as const;

export type OutboxEventType =
    (typeof OUTBOX_EVENT_TYPES)[keyof typeof OUTBOX_EVENT_TYPES];
