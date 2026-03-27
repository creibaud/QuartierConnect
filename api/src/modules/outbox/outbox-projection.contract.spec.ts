import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxProjectionService } from "src/modules/outbox/outbox-projection.service";

describe("OutboxProjectionService contracts", () => {
    const neo4jSync = {
        upsertUser: jest.fn().mockResolvedValue(undefined),
        anonymizeUser: jest.fn().mockResolvedValue(undefined),
        createEventWithCreator: jest.fn().mockResolvedValue(undefined),
        updateEvent: jest.fn().mockResolvedValue(undefined),
        deleteEvent: jest.fn().mockResolvedValue(undefined),
        registerUserToEvent: jest.fn().mockResolvedValue(undefined),
        cancelEventRegistration: jest.fn().mockResolvedValue(undefined),
        likeEvent: jest.fn().mockResolvedValue(undefined),
        createServiceWithCreator: jest.fn().mockResolvedValue(undefined),
        updateService: jest.fn().mockResolvedValue(undefined),
        setServiceStatus: jest.fn().mockResolvedValue(undefined),
        deleteService: jest.fn().mockResolvedValue(undefined),
        completeService: jest.fn().mockResolvedValue(undefined),
        createQuartier: jest.fn().mockResolvedValue(undefined),
        updateQuartierName: jest.fn().mockResolvedValue(undefined),
        deleteQuartier: jest.fn().mockResolvedValue(undefined),
        assignUserToQuartier: jest.fn().mockResolvedValue(undefined),
        removeUserFromQuartier: jest.fn().mockResolvedValue(undefined),
    };

    const service = new OutboxProjectionService(neo4jSync as never);

    const makeEvent = (
        eventType: string,
        payload: Record<string, unknown>,
    ) => ({
        eventId: "evt-1",
        aggregateType: "test",
        aggregateId: "agg-1",
        eventType,
        payload,
        status: "pending" as const,
        attempts: 0,
        createdAt: new Date(),
        availableAt: new Date(),
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("projects all supported outbox event contracts", async () => {
        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.userRegistered, {
                id: "user-1",
                email: "user@test.local",
                firstName: "Test",
                lastName: "User",
                role: "resident",
                isActive: true,
                updatedAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent("user.updated", {
                id: "user-1",
                email: "user@test.local",
                firstName: "Updated",
                lastName: "User",
                role: "admin",
                isActive: true,
                updatedAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent("user.anonymized", {
                userId: "user-1",
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.eventCreated, {
                id: "event-1",
                title: "Event",
                category: "culture",
                startDate: new Date(),
                createdAt: new Date(),
                creatorId: "user-1",
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.eventUpdated, {
                id: "event-1",
                title: "Event 2",
                category: "sport",
                startDate: new Date().toISOString(),
                updatedAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.eventDeleted, {
                id: "event-1",
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.eventRegistrationCreated, {
                userId: "user-1",
                eventId: "event-1",
                createdAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.eventRegistrationCancelled, {
                userId: "user-1",
                eventId: "event-1",
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.eventSwipeLiked, {
                userId: "user-1",
                eventId: "event-1",
                swipedAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.serviceCreated, {
                id: "service-1",
                title: "Service",
                category: "help",
                creatorId: "user-1",
                createdAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.serviceUpdated, {
                id: "service-1",
                title: "Service 2",
                category: "repair",
                updatedAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.serviceDeleted, {
                id: "service-1",
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.serviceAccepted, {
                serviceId: "service-1",
                acceptedAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.serviceCompleted, {
                creatorId: "user-1",
                acceptorId: "user-2",
                serviceId: "service-1",
                points: 2,
                completedAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent(OUTBOX_EVENT_TYPES.serviceCancelled, {
                serviceId: "service-1",
                cancelledAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent("quartier.created", {
                id: "quartier-1",
                name: "Belleville",
            }) as never,
        );

        await service.project(
            makeEvent("quartier.name.updated", {
                id: "quartier-1",
                name: "Belleville Est",
            }) as never,
        );

        await service.project(
            makeEvent("quartier.deleted", {
                id: "quartier-1",
            }) as never,
        );

        await service.project(
            makeEvent("quartier.member.added", {
                quartierId: "quartier-1",
                userId: "user-1",
                email: "user@test.local",
                firstName: "Test",
                lastName: "User",
                role: "resident",
                isActive: true,
                updatedAt: new Date(),
            }) as never,
        );

        await service.project(
            makeEvent("quartier.member.removed", {
                quartierId: "quartier-1",
                userId: "user-1",
            }) as never,
        );

        expect(neo4jSync.upsertUser).toHaveBeenCalledTimes(2);
        expect(neo4jSync.anonymizeUser).toHaveBeenCalledTimes(1);
        expect(neo4jSync.createEventWithCreator).toHaveBeenCalledTimes(1);
        expect(neo4jSync.updateEvent).toHaveBeenCalledTimes(1);
        expect(neo4jSync.deleteEvent).toHaveBeenCalledTimes(1);
        expect(neo4jSync.registerUserToEvent).toHaveBeenCalledTimes(1);
        expect(neo4jSync.cancelEventRegistration).toHaveBeenCalledTimes(1);
        expect(neo4jSync.likeEvent).toHaveBeenCalledTimes(1);
        expect(neo4jSync.createServiceWithCreator).toHaveBeenCalledTimes(1);
        expect(neo4jSync.updateService).toHaveBeenCalledTimes(1);
        expect(neo4jSync.deleteService).toHaveBeenCalledTimes(1);
        expect(neo4jSync.setServiceStatus).toHaveBeenCalledTimes(2);
        expect(neo4jSync.completeService).toHaveBeenCalledTimes(1);
        expect(neo4jSync.createQuartier).toHaveBeenCalledTimes(1);
        expect(neo4jSync.updateQuartierName).toHaveBeenCalledTimes(1);
        expect(neo4jSync.deleteQuartier).toHaveBeenCalledTimes(1);
        expect(neo4jSync.assignUserToQuartier).toHaveBeenCalledTimes(1);
        expect(neo4jSync.removeUserFromQuartier).toHaveBeenCalledTimes(1);
    });

    it("rejects invalid payload for strict contract fields", async () => {
        await expect(
            service.project(
                makeEvent(OUTBOX_EVENT_TYPES.serviceCompleted, {
                    creatorId: "user-1",
                    acceptorId: "user-2",
                    serviceId: "service-1",
                    points: "2",
                    completedAt: new Date(),
                }) as never,
            ),
        ).rejects.toThrow("Missing or invalid number payload field: points");
    });
});
