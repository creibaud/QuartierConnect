import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ObjectId } from "mongodb";
import { CreateEventDto } from "src/modules/events/dto/create-event.dto";
import { SwipeEventDto } from "src/modules/events/dto/swipe-event.dto";
import { UpdateEventDto } from "src/modules/events/dto/update-event.dto";
import { EventRegistrationService } from "src/modules/events/event-registration.service";
import { EventSwipeService } from "src/modules/events/event-swipe.service";
import { EventsService } from "src/modules/events/events.service";
import type { IEventsRepository } from "src/modules/events/interfaces/events-repository.interface";
import type { IWeatherService } from "src/modules/events/interfaces/weather-service.interface";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";

const makeObjectId = () => new ObjectId();

const buildEventDocument = (overrides = {}) => ({
    id: new ObjectId().toString(),
    _id: makeObjectId(),
    quartierId: "quartier-uuid",
    creatorId: "creator-user-id",
    title: "Test Event",
    category: "social" as const,
    startDate: new Date(Date.now() + 86_400_000),
    registrationCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("EventsService", () => {
    let service: EventsService;
    let eventRepository: jest.Mocked<IEventsRepository>;
    let registrationService: jest.Mocked<EventRegistrationService>;
    let swipeService: jest.Mocked<EventSwipeService>;
    let outboxService: jest.Mocked<OutboxService>;
    let weatherService: jest.Mocked<IWeatherService>;

    beforeEach(async () => {
        eventRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            registerUser: jest.fn(),
            cancelRegistration: jest.fn(),
            getRegistrations: jest.fn(),
            getRegistrationCount: jest.fn(),
            recordSwipe: jest.fn(),
            getNextSwipe: jest.fn(),
            hasUserSwiped: jest.fn(),
            findByQuartierId: jest.fn(),
        } as any;

        registrationService = {
            register: jest.fn(),
            cancelRegistration: jest.fn(),
            getRegistrations: jest.fn(),
            getRegistrationCount: jest.fn(),
        } as any;

        swipeService = {
            recordSwipe: jest.fn(),
            getNextSwipe: jest.fn(),
            hasUserSwiped: jest.fn(),
        } as any;

        outboxService = {
            publish: jest.fn().mockResolvedValue(undefined),
        } as any;

        weatherService = {
            getWeatherForEvent: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                { provide: "IEventsRepository", useValue: eventRepository },
                {
                    provide: EventRegistrationService,
                    useValue: registrationService,
                },
                { provide: EventSwipeService, useValue: swipeService },
                { provide: OutboxService, useValue: outboxService },
                { provide: "IWeatherService", useValue: weatherService },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
    });

    describe("create", () => {
        const dto: CreateEventDto = {
            title: "Neighborhood Picnic",
            category: "social",
            startDate: new Date(Date.now() + 86_400_000).toISOString(),
            quartierId: "quartier-uuid",
        };

        it("inserts a document into MongoDB and publishes outbox event", async () => {
            const eventId = new ObjectId();
            const createdEvent = {
                id: eventId.toString(),
                _id: eventId,
                ...dto,
                creatorId: "creator-user-id",
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            eventRepository.create.mockResolvedValue(createdEvent as any);

            const result = await service.create("creator-user-id", dto);

            expect(eventRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: dto.title,
                    category: dto.category,
                    creatorId: "creator-user-id",
                }),
            );

            expect(outboxService.publish).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: OUTBOX_EVENT_TYPES.eventCreated,
                    aggregateId: eventId.toString(),
                }),
            );

            expect(result).toMatchObject({
                category: dto.category,
                creatorId: "creator-user-id",
            });
        });
    });

    describe("findOne", () => {
        it("returns the event when found", async () => {
            const eventDoc = buildEventDocument();
            eventRepository.findById.mockResolvedValue(eventDoc as any);

            const result = await service.findOne(eventDoc.id);

            expect(eventRepository.findById).toHaveBeenCalledWith(eventDoc.id);
            // toEventResponse filters out _id and transforms id
            expect(result).toMatchObject({
                category: eventDoc.category,
                creatorId: eventDoc.creatorId,
                quartierId: eventDoc.quartierId,
                title: eventDoc.title,
            });
            expect(result._id).toBeUndefined();
        });

        it("throws NotFoundException when event not found", async () => {
            eventRepository.findById.mockResolvedValue(null);

            await expect(
                service.findOne("non-existent-id"),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe("register", () => {
        it("delegates to registrationService.register", async () => {
            const eventId = makeObjectId().toString();

            await service.register(eventId, "user-id");

            expect(registrationService.register).toHaveBeenCalledWith(
                eventId,
                "user-id",
            );
        });

        it("throws ConflictException when user is already registered", async () => {
            const eventId = makeObjectId().toString();
            const conflictError = new ConflictException(
                "User already registered for this event",
            );
            registrationService.register.mockRejectedValue(conflictError);

            await expect(
                service.register(eventId, "user-id"),
            ).rejects.toBeInstanceOf(ConflictException);
        });
    });

    describe("swipe", () => {
        it("publishes outbox event when liked is true", async () => {
            const dto: SwipeEventDto = {
                eventId: makeObjectId().toString(),
                liked: true,
            };

            await service.swipe("user-id", dto);

            expect(swipeService.recordSwipe).toHaveBeenCalledWith(
                "user-id",
                dto,
            );
        });

        it("does not publish outbox like event when liked is false", async () => {
            const dto: SwipeEventDto = {
                eventId: makeObjectId().toString(),
                liked: false,
            };

            await service.swipe("user-id", dto);

            expect(swipeService.recordSwipe).toHaveBeenCalledWith(
                "user-id",
                dto,
            );
        });
    });

    describe("cancelRegistration", () => {
        it("updates registration status and publishes outbox event", async () => {
            const eventId = makeObjectId().toString();

            await service.cancelRegistration(eventId, "user-id");

            expect(registrationService.cancelRegistration).toHaveBeenCalledWith(
                eventId,
                "user-id",
            );
        });
    });

    describe("update", () => {
        it("throws NotFoundException when event not found", async () => {
            const eventId = makeObjectId().toString();
            eventRepository.findById.mockResolvedValue(null);

            const dto: UpdateEventDto = { title: "Updated Title" };

            await expect(
                service.update(eventId, "user-id", "resident", dto),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it("throws ForbiddenException when user is not creator and not admin/moderator", async () => {
            const eventId = makeObjectId().toString();
            const eventDoc = buildEventDocument({
                id: eventId,
                creatorId: "other-user-id",
            });

            eventRepository.findById.mockResolvedValue(eventDoc as any);

            const dto: UpdateEventDto = { title: "Updated Title" };

            await expect(
                service.update(eventId, "user-id", "resident", dto),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it("allows admin to update any event", async () => {
            const eventId = makeObjectId().toString();
            const eventDoc = buildEventDocument({
                id: eventId,
                creatorId: "other-user-id",
            });

            eventRepository.findById.mockResolvedValue(eventDoc as any);
            eventRepository.update.mockResolvedValue({
                ...eventDoc,
                title: "Admin Updated Title",
            } as any);

            const dto: UpdateEventDto = { title: "Admin Updated Title" };

            const result = await service.update(
                eventId,
                "admin-user-id",
                "admin",
                dto,
            );

            expect(eventRepository.update).toHaveBeenCalledWith(
                eventId,
                expect.objectContaining({ title: "Admin Updated Title" }),
            );
            expect(result).toBeDefined();
        });

        it("allows creator to update their event", async () => {
            const eventId = makeObjectId().toString();
            const creatorId = "creator-user-id";
            const eventDoc = buildEventDocument({
                id: eventId,
                creatorId,
            });

            eventRepository.findById.mockResolvedValue(eventDoc as any);
            eventRepository.update.mockResolvedValue({
                ...eventDoc,
                title: "Creator Updated Title",
            } as any);

            const dto: UpdateEventDto = { title: "Creator Updated Title" };

            const result = await service.update(
                eventId,
                creatorId,
                "resident",
                dto,
            );

            expect(eventRepository.update).toHaveBeenCalledWith(
                eventId,
                expect.objectContaining({ title: "Creator Updated Title" }),
            );
            expect(result).toBeDefined();
        });
    });

    describe("delete", () => {
        it("throws NotFoundException when event not found", async () => {
            const eventId = makeObjectId().toString();
            eventRepository.findById.mockResolvedValue(null);

            await expect(
                service.delete(eventId, "user-id", "resident"),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it("throws ForbiddenException when user is not creator and not admin/moderator", async () => {
            const eventId = makeObjectId().toString();
            const eventDoc = buildEventDocument({
                id: eventId,
                creatorId: "other-user-id",
            });

            eventRepository.findById.mockResolvedValue(eventDoc as any);

            await expect(
                service.delete(eventId, "user-id", "resident"),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it("allows admin to delete any event", async () => {
            const eventId = makeObjectId().toString();
            const eventDoc = buildEventDocument({
                id: eventId,
                creatorId: "other-user-id",
            });

            eventRepository.findById.mockResolvedValue(eventDoc as any);
            eventRepository.delete.mockResolvedValue(undefined);

            await service.delete(eventId, "admin-user-id", "admin");

            expect(eventRepository.delete).toHaveBeenCalledWith(eventId);
            expect(outboxService.publish).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: OUTBOX_EVENT_TYPES.eventDeleted,
                    aggregateId: eventId,
                }),
            );
        });
    });

    describe("findAll", () => {
        it("returns paginated events", async () => {
            const events = [buildEventDocument(), buildEventDocument()];
            eventRepository.findAll.mockResolvedValue({
                data: events,
                total: 2,
                page: 1,
                limit: 20,
            } as any);

            const result = await service.findAll(
                { page: 1, limit: 20 },
                "user-id",
            );

            expect(eventRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ page: 1, limit: 20 }),
            );
            expect(result.data).toHaveLength(2);
            expect(result.meta.total).toBe(2);
        });
    });

    describe("getRegistrations", () => {
        it("delegates to registrationService.getRegistrations", async () => {
            const eventId = makeObjectId().toString();
            const registrations = [
                { userId: "user-1", status: "registered" },
                { userId: "user-2", status: "registered" },
            ];

            registrationService.getRegistrations.mockResolvedValue(
                registrations as any,
            );

            const query = {};
            const result = await service.getRegistrations(eventId, query);

            expect(registrationService.getRegistrations).toHaveBeenCalledWith(
                eventId,
                query,
            );
            expect(result).toEqual(registrations);
        });
    });

    describe("getNextSwipe", () => {
        it("delegates to swipeService.getNextSwipe", async () => {
            const userId = "user-id";
            const quartierId = "quartier-id";
            const nextEvent = buildEventDocument();

            swipeService.getNextSwipe.mockResolvedValue(nextEvent as any);

            const result = await service.getNextSwipe(userId, quartierId);

            expect(swipeService.getNextSwipe).toHaveBeenCalledWith(
                userId,
                quartierId,
            );
            expect(result).toEqual(nextEvent);
        });
    });
});
