import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { OutboxEventDocument } from "src/database/mongodb/models/outbox-event.model";
import { Neo4jSyncService } from "src/database/neo4j/neo4j-sync.service";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";

@Injectable()
export class OutboxProjectionService {
    private readonly logger = new Logger(OutboxProjectionService.name);

    constructor(private readonly neo4jSync: Neo4jSyncService) {}

    async project(event: OutboxEventDocument) {
        const payload = event.payload;

        switch (event.eventType) {
            case OUTBOX_EVENT_TYPES.userRegistered:
                await this.neo4jSync.upsertUser({
                    id: this.requiredString(payload.id, "id"),
                    email: this.requiredString(payload.email, "email"),
                    firstName: this.requiredString(
                        payload.firstName,
                        "firstName",
                    ),
                    lastName: this.requiredString(payload.lastName, "lastName"),
                    role: this.requiredString(payload.role, "role"),
                    isActive: this.requiredBoolean(
                        payload.isActive,
                        "isActive",
                    ),
                    updatedAt: this.optionalDate(payload.updatedAt),
                });
                return;

            case OUTBOX_EVENT_TYPES.userUpdated:
                await this.neo4jSync.upsertUser({
                    id: this.requiredString(payload.id, "id"),
                    email: this.requiredString(payload.email, "email"),
                    firstName: this.requiredString(
                        payload.firstName,
                        "firstName",
                    ),
                    lastName: this.requiredString(payload.lastName, "lastName"),
                    role: this.requiredString(payload.role, "role"),
                    isActive: this.requiredBoolean(
                        payload.isActive,
                        "isActive",
                    ),
                    updatedAt: this.optionalDate(payload.updatedAt),
                });
                return;

            case OUTBOX_EVENT_TYPES.userAnonymized:
                await this.neo4jSync.anonymizeUser(
                    this.requiredString(payload.userId, "userId"),
                );
                return;

            case OUTBOX_EVENT_TYPES.eventCreated:
                await this.neo4jSync.createEventWithCreator({
                    id: this.requiredString(payload.id, "id"),
                    title: this.requiredString(payload.title, "title"),
                    category: this.requiredString(payload.category, "category"),
                    startDate: this.requiredDate(
                        payload.startDate,
                        "startDate",
                    ),
                    createdAt: this.requiredDate(
                        payload.createdAt,
                        "createdAt",
                    ),
                    creatorId: this.requiredString(
                        payload.creatorId,
                        "creatorId",
                    ),
                });
                return;

            case OUTBOX_EVENT_TYPES.eventUpdated:
                await this.neo4jSync.updateEvent({
                    id: this.requiredString(payload.id, "id"),
                    title: this.optionalString(payload.title),
                    category: this.optionalString(payload.category),
                    startDate: this.optionalString(payload.startDate),
                    updatedAt: this.requiredDate(
                        payload.updatedAt,
                        "updatedAt",
                    ),
                });
                return;

            case OUTBOX_EVENT_TYPES.eventDeleted:
                await this.neo4jSync.deleteEvent(
                    this.requiredString(payload.id, "id"),
                );
                return;

            case OUTBOX_EVENT_TYPES.eventRegistrationCreated:
                await this.neo4jSync.registerUserToEvent(
                    this.requiredString(payload.userId, "userId"),
                    this.requiredString(payload.eventId, "eventId"),
                    this.requiredDate(payload.createdAt, "createdAt"),
                );
                return;

            case OUTBOX_EVENT_TYPES.eventRegistrationCancelled:
                await this.neo4jSync.cancelEventRegistration(
                    this.requiredString(payload.userId, "userId"),
                    this.requiredString(payload.eventId, "eventId"),
                );
                return;

            case OUTBOX_EVENT_TYPES.eventSwipeLiked:
                await this.neo4jSync.likeEvent(
                    this.requiredString(payload.userId, "userId"),
                    this.requiredString(payload.eventId, "eventId"),
                    this.requiredDate(payload.swipedAt, "swipedAt"),
                );
                return;

            case OUTBOX_EVENT_TYPES.serviceCreated:
                await this.neo4jSync.createServiceWithCreator({
                    id: this.requiredString(payload.id, "id"),
                    title: this.requiredString(payload.title, "title"),
                    category: this.requiredString(payload.category, "category"),
                    creatorId: this.requiredString(
                        payload.creatorId,
                        "creatorId",
                    ),
                    createdAt: this.requiredDate(
                        payload.createdAt,
                        "createdAt",
                    ),
                });
                return;

            case OUTBOX_EVENT_TYPES.serviceUpdated:
                await this.neo4jSync.updateService({
                    id: this.requiredString(payload.id, "id"),
                    title: this.optionalString(payload.title),
                    category: this.optionalString(payload.category),
                    updatedAt: this.requiredDate(
                        payload.updatedAt,
                        "updatedAt",
                    ),
                });
                return;

            case OUTBOX_EVENT_TYPES.serviceDeleted:
                await this.neo4jSync.deleteService(
                    this.requiredString(payload.id, "id"),
                );
                return;

            case OUTBOX_EVENT_TYPES.serviceAccepted:
                await this.neo4jSync.setServiceStatus(
                    this.requiredString(payload.serviceId, "serviceId"),
                    "accepted",
                    this.requiredDate(payload.acceptedAt, "acceptedAt"),
                );
                return;

            case OUTBOX_EVENT_TYPES.serviceCompleted:
                await this.neo4jSync.completeService({
                    creatorId: this.requiredString(
                        payload.creatorId,
                        "creatorId",
                    ),
                    acceptorId: this.requiredString(
                        payload.acceptorId,
                        "acceptorId",
                    ),
                    serviceId: this.requiredString(
                        payload.serviceId,
                        "serviceId",
                    ),
                    points: this.requiredNumber(payload.points, "points"),
                    date: this.requiredDate(payload.completedAt, "completedAt"),
                });
                return;

            case OUTBOX_EVENT_TYPES.serviceCancelled:
                await this.neo4jSync.setServiceStatus(
                    this.requiredString(payload.serviceId, "serviceId"),
                    "cancelled",
                    this.requiredDate(payload.cancelledAt, "cancelledAt"),
                );
                return;

            case OUTBOX_EVENT_TYPES.quartierCreated:
                await this.neo4jSync.createQuartier(
                    this.requiredString(payload.id, "id"),
                    this.requiredString(payload.name, "name"),
                );
                return;

            case OUTBOX_EVENT_TYPES.quartierNameUpdated:
                await this.neo4jSync.updateQuartierName(
                    this.requiredString(payload.id, "id"),
                    this.requiredString(payload.name, "name"),
                );
                return;

            case OUTBOX_EVENT_TYPES.quartierDeleted:
                await this.neo4jSync.deleteQuartier(
                    this.requiredString(payload.id, "id"),
                );
                return;

            case OUTBOX_EVENT_TYPES.quartierMemberAdded:
                await this.neo4jSync.assignUserToQuartier(
                    {
                        id: this.requiredString(payload.userId, "userId"),
                        email: this.requiredString(payload.email, "email"),
                        firstName: this.requiredString(
                            payload.firstName,
                            "firstName",
                        ),
                        lastName: this.requiredString(
                            payload.lastName,
                            "lastName",
                        ),
                        role: this.requiredString(payload.role, "role"),
                        isActive: this.requiredBoolean(
                            payload.isActive,
                            "isActive",
                        ),
                        updatedAt: this.optionalDate(payload.updatedAt),
                    },
                    this.requiredString(payload.quartierId, "quartierId"),
                );
                return;

            case OUTBOX_EVENT_TYPES.quartierMemberRemoved:
                await this.neo4jSync.removeUserFromQuartier(
                    this.requiredString(payload.userId, "userId"),
                    this.requiredString(payload.quartierId, "quartierId"),
                );
                return;

            default:
                this.logger.debug(
                    `No projection handler for ${event.eventType}`,
                );
        }
    }

    private requiredString(value: unknown, field: string) {
        if (typeof value !== "string" || value.length === 0) {
            throw new BadRequestException(
                `Missing or invalid string payload field: ${field}`,
            );
        }
        return value;
    }

    private optionalString(value: unknown) {
        return typeof value === "string" ? value : undefined;
    }

    private requiredBoolean(value: unknown, field: string) {
        if (typeof value !== "boolean") {
            throw new BadRequestException(
                `Missing or invalid boolean payload field: ${field}`,
            );
        }
        return value;
    }

    private requiredNumber(value: unknown, field: string) {
        if (typeof value !== "number" || Number.isNaN(value)) {
            throw new BadRequestException(
                `Missing or invalid number payload field: ${field}`,
            );
        }
        return value;
    }

    private requiredDate(value: unknown, field: string) {
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === "string") {
            return new Date(value);
        }
        throw new BadRequestException(
            `Missing or invalid date payload field: ${field}`,
        );
    }

    private optionalDate(value: unknown) {
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === "string") {
            return new Date(value);
        }
        return undefined;
    }
}
