import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ObjectId } from "mongodb";
import { CreateEventDto } from "src/modules/events/dto/create-event.dto";
import { EventQueryDto } from "src/modules/events/dto/event-query.dto";
import { SwipeEventDto } from "src/modules/events/dto/swipe-event.dto";
import { UpdateEventDto } from "src/modules/events/dto/update-event.dto";
import { EventsController } from "src/modules/events/events.controller";
import { EventsService } from "src/modules/events/events.service";

const mockUser = {
    id: "user-uuid",
    email: "user@example.com",
    fullName: "Test User",
    role: "resident" as const,
    balance: "100",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockAdmin = {
    ...mockUser,
    id: "admin-uuid",
    role: "admin" as const,
};

const mockEventData = {
    id: new ObjectId().toString(),
    _id: new ObjectId(),
    title: "Test Event",
    category: "social" as const,
    quartierId: "quartier-uuid",
    creatorId: mockUser.id,
    startDate: new Date(Date.now() + 86400000),
    description: "Test event description",
    registrationCount: 5,
    maxCapacity: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("EventsController", () => {
    let controller: EventsController;
    let service: jest.Mocked<EventsService>;

    beforeEach(async () => {
        const mockService: jest.Mocked<EventsService> = {
            create: jest.fn(),
            findOne: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            register: jest.fn(),
            cancelRegistration: jest.fn(),
            swipe: jest.fn(),
            getRegistrations: jest.fn(),
            getNextSwipe: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EventsController],
            providers: [
                {
                    provide: EventsService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<EventsController>(EventsController);
        service = module.get(EventsService) as jest.Mocked<EventsService>;
    });

    describe("create", () => {
        it("should create an event successfully", async () => {
            const dto: CreateEventDto = {
                title: "New Event",
                category: "social",
                quartierId: "quartier-uuid",
                startDate: new Date(Date.now() + 86400000).toISOString(),
            };

            service.create.mockResolvedValue(mockEventData);

            const result = await controller.create(mockUser, dto);

            expect(service.create).toHaveBeenCalledWith(mockUser.id, dto);
            expect(result).toEqual(mockEventData);
        });

        it("should throw BadRequestException on invalid data", async () => {
            const dto: CreateEventDto = {
                title: "",
                category: "social",
                quartierId: "quartier-uuid",
                startDate: new Date().toISOString(),
            };

            service.create.mockRejectedValue(
                new BadRequestException("Title is required"),
            );

            await expect(controller.create(mockUser, dto)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe("findAll", () => {
        it("should return paginated list of events", async () => {
            const query: EventQueryDto = {
                page: 1,
                limit: 10,
            };

            const mockResponse = {
                data: [mockEventData],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };

            service.findAll.mockResolvedValue(mockResponse);

            const result = await controller.findAll(query, mockUser);

            expect(service.findAll).toHaveBeenCalledWith(query, mockUser.id);
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(1);
        });

        it("should filter events by quartier", async () => {
            const query: EventQueryDto = {
                page: 1,
                limit: 10,
                quartierId: "quartier-uuid",
            };

            service.findAll.mockResolvedValue({
                data: [mockEventData],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            });

            await controller.findAll(query, mockUser);

            expect(service.findAll).toHaveBeenCalledWith(query, mockUser.id);
        });

        it("should support pagination", async () => {
            const query: EventQueryDto = {
                page: 2,
                limit: 5,
            };

            service.findAll.mockResolvedValue({
                data: [],
                meta: {
                    total: 15,
                    page: 2,
                    limit: 5,
                    totalPages: 3,
                    hasNextPage: true,
                    hasPrevPage: true,
                },
            });

            const result = await controller.findAll(query, mockUser);

            expect(result.meta.page).toBe(2);
            expect(result.meta.hasNextPage).toBe(true);
        });
    });

    describe("findOne", () => {
        it("should return a single event", async () => {
            const eventId = mockEventData.id;
            service.findOne.mockResolvedValue(mockEventData);

            const result = await controller.findOne(eventId);

            expect(service.findOne).toHaveBeenCalledWith(eventId);
            expect(result).toEqual(mockEventData);
        });

        it("should throw NotFoundException if event not found", async () => {
            service.findOne.mockRejectedValue(
                new NotFoundException("Event not found"),
            );

            await expect(controller.findOne("non-existent")).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("update", () => {
        it("should update event successfully", async () => {
            const eventId = mockEventData.id;
            const dto: UpdateEventDto = {
                title: "Updated Title",
            };

            const updatedEvent = { ...mockEventData, title: "Updated Title" };
            service.update.mockResolvedValue(updatedEvent);

            const result = await controller.update(eventId, mockUser, dto);

            expect(service.update).toHaveBeenCalledWith(
                eventId,
                mockUser.id,
                mockUser.role,
                dto,
            );
            expect(result.title).toBe("Updated Title");
        });

        it("should throw ForbiddenException if not authorized", async () => {
            const eventId = mockEventData.id;
            const dto: UpdateEventDto = { title: "Updated" };

            service.update.mockRejectedValue(
                new ForbiddenException("Not authorized"),
            );

            await expect(
                controller.update(eventId, mockUser, dto),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should allow admin to update any event", async () => {
            const eventId = mockEventData.id;
            const dto: UpdateEventDto = { title: "Admin Update" };

            const updatedEvent = { ...mockEventData, title: "Admin Update" };
            service.update.mockResolvedValue(updatedEvent);

            const result = await controller.update(eventId, mockAdmin, dto);

            expect(service.update).toHaveBeenCalledWith(
                eventId,
                mockAdmin.id,
                mockAdmin.role,
                dto,
            );
            expect(result.title).toBe("Admin Update");
        });
    });

    describe("delete", () => {
        it("should delete event successfully", async () => {
            const eventId = mockEventData.id;

            service.delete.mockResolvedValue(undefined);

            await expect(
                controller.delete(eventId, mockUser),
            ).resolves.not.toThrow();

            expect(service.delete).toHaveBeenCalledWith(
                eventId,
                mockUser.id,
                mockUser.role,
            );
        });

        it("should throw ForbiddenException if not authorized", async () => {
            const eventId = mockEventData.id;

            service.delete.mockRejectedValue(
                new ForbiddenException("Not authorized"),
            );

            await expect(controller.delete(eventId, mockUser)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it("should allow admin to delete any event", async () => {
            const eventId = mockEventData.id;

            service.delete.mockResolvedValue(undefined);

            await expect(
                controller.delete(eventId, mockAdmin),
            ).resolves.not.toThrow();

            expect(service.delete).toHaveBeenCalledWith(
                eventId,
                mockAdmin.id,
                mockAdmin.role,
            );
        });
    });

    describe("register", () => {
        it("should register user for event", async () => {
            const eventId = mockEventData.id;

            service.register.mockResolvedValue(undefined);

            await expect(
                controller.register(eventId, mockUser),
            ).resolves.not.toThrow();

            expect(service.register).toHaveBeenCalledWith(eventId, mockUser.id);
        });

        it("should throw ConflictException if already registered", async () => {
            const eventId = mockEventData.id;

            service.register.mockRejectedValue(
                new Error("User already registered"),
            );

            await expect(
                controller.register(eventId, mockUser),
            ).rejects.toThrow();
        });
    });

    describe("cancelRegistration", () => {
        it("should cancel registration successfully", async () => {
            const eventId = mockEventData.id;

            service.cancelRegistration.mockResolvedValue(undefined);

            await expect(
                controller.cancelRegistration(eventId, mockUser),
            ).resolves.not.toThrow();

            expect(service.cancelRegistration).toHaveBeenCalledWith(
                eventId,
                mockUser.id,
            );
        });

        it("should throw NotFoundException if not registered", async () => {
            const eventId = mockEventData.id;

            service.cancelRegistration.mockRejectedValue(
                new NotFoundException("Registration not found"),
            );

            await expect(
                controller.cancelRegistration(eventId, mockUser),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("swipe", () => {
        it("should record swipe like", async () => {
            const dto: SwipeEventDto = {
                eventId: new ObjectId().toString(),
                liked: true,
            };

            service.swipe.mockResolvedValue(undefined);

            await expect(
                controller.swipe(mockUser, dto),
            ).resolves.not.toThrow();

            expect(service.swipe).toHaveBeenCalledWith(mockUser.id, dto);
        });

        it("should record swipe dislike", async () => {
            const dto: SwipeEventDto = {
                eventId: new ObjectId().toString(),
                liked: false,
            };

            service.swipe.mockResolvedValue(undefined);

            await expect(
                controller.swipe(mockUser, dto),
            ).resolves.not.toThrow();

            expect(service.swipe).toHaveBeenCalledWith(mockUser.id, dto);
        });
    });

    describe("getNextSwipe", () => {
        it("should return next event to swipe", async () => {
            service.getNextSwipe.mockResolvedValue(mockEventData);

            const result = await controller.getNextSwipe(
                mockUser,
                "quartier-uuid",
            );

            expect(service.getNextSwipe).toHaveBeenCalledWith(
                mockUser.id,
                "quartier-uuid",
            );
            expect(result).toEqual(mockEventData);
        });

        it("should return null if no more events", async () => {
            service.getNextSwipe.mockResolvedValue(null);

            const result = await controller.getNextSwipe(
                mockUser,
                "quartier-uuid",
            );

            expect(result).toBeNull();
        });
    });

    describe("getRegistrations", () => {
        it("should return list of registrations for event", async () => {
            const eventId = mockEventData.id;
            const mockRegistrations = [
                { userId: "user-1", registeredAt: new Date() },
                { userId: "user-2", registeredAt: new Date() },
            ];

            service.getRegistrations.mockResolvedValue(mockRegistrations);

            const result = await controller.getRegistrations(eventId, {});

            expect(service.getRegistrations).toHaveBeenCalledWith(eventId, {});
            expect(result).toHaveLength(2);
        });

        it("should filter registrations by status", async () => {
            const eventId = mockEventData.id;

            service.getRegistrations.mockResolvedValue([]);

            await controller.getRegistrations(eventId, { page: 1, limit: 10 });

            expect(service.getRegistrations).toHaveBeenCalledWith(eventId, {
                page: 1,
                limit: 10,
            });
        });
    });
});
