import {
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { CreateEventDto } from "src/modules/events/dto/create-event.dto";
import { EventQueryDto } from "src/modules/events/dto/event-query.dto";
import { SwipeEventDto } from "src/modules/events/dto/swipe-event.dto";
import { UpdateEventDto } from "src/modules/events/dto/update-event.dto";
import { EventRegistrationService } from "src/modules/events/event-registration.service";
import { EventSwipeService } from "src/modules/events/event-swipe.service";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        @Inject("IEventsRepository")
        private readonly eventRepository: IEventsRepository,
        private readonly outbox: OutboxService,
        private readonly registrationService: EventRegistrationService,
        private readonly swipeService: EventSwipeService,
    ) {}

    async create(creatorId: string, dto: CreateEventDto) {
        const event = await this.eventRepository.create({
            quartierId: dto.quartierId,
            creatorId,
            title: dto.title,
            description: dto.description,
            category: dto.category,
            startDate: new Date(dto.startDate),
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            location: dto.location,
            locationName: dto.locationName,
            maxCapacity: dto.maxCapacity,
            imageUrl: dto.imageUrl,
            registrationCount: 0,
        });

        const id = event._id?.toString();

        await this.outbox.publish({
            aggregateType: "event",
            aggregateId: id,
            eventType: OUTBOX_EVENT_TYPES.eventCreated,
            payload: {
                id,
                creatorId,
                quartierId: dto.quartierId,
                title: dto.title,
                category: dto.category,
                startDate: event.startDate,
                createdAt: event.createdAt,
            },
        });

        this.logger.log(`Event created: ${id} by user ${creatorId}`);

        return { id, ...event };
    }

    async findAll(query: EventQueryDto, userId: string) {
        void userId;
        const { page = 1, limit = 10 } = query;

        const filter: Record<string, unknown> = {};

        if (query.category) {
            filter.category = query.category;
        }

        if (query.quartierId) {
            filter.quartierId = query.quartierId;
        }

        if (query.upcoming) {
            filter.startDate = { $gt: new Date() };
        }

        if (query.search) {
            filter.title = { $regex: query.search, $options: "i" };
        }

        const result = await this.eventRepository.findAll({
            page,
            limit,
            quartierId: query.quartierId,
            category: query.category,
            search: query.search,
            sortBy: "createdAt",
            sortOrder: "desc",
        });

        return {
            data: result.data.map((event) => this.toEventResponse(event)),
            meta: {
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit),
            },
        };
    }

    async findOne(id: string) {
        const event = await this.eventRepository.findById(id);

        if (!event) {
            throw new NotFoundException("Event not found");
        }

        return this.toEventResponse(event);
    }

    async update(
        id: string,
        userId: string,
        userRole: string,
        dto: UpdateEventDto,
    ) {
        const event = await this.findOne(id);

        const isPrivileged = userRole === "admin" || userRole === "moderator";
        if (event.creatorId !== userId && !isPrivileged) {
            throw new ForbiddenException(
                "You are not allowed to update this event",
            );
        }

        const now = new Date();
        const { startDate, endDate, ...rest } = dto;
        await this.eventRepository.update(id, {
            ...rest,
            ...(startDate ? { startDate: new Date(startDate) } : {}),
            ...(endDate ? { endDate: new Date(endDate) } : {}),
        });

        await this.outbox.publish({
            aggregateType: "event",
            aggregateId: id,
            eventType: OUTBOX_EVENT_TYPES.eventUpdated,
            payload: {
                id,
                updatedBy: userId,
                title: dto.title,
                category: dto.category,
                startDate: dto.startDate,
                updatedAt: now,
            },
        });

        this.logger.log(`Event updated: ${id} by user ${userId}`);

        return this.findOne(id);
    }

    async delete(id: string, userId: string, userRole: string) {
        const event = await this.findOne(id);

        const isPrivileged = userRole === "admin" || userRole === "moderator";
        if (event.creatorId !== userId && !isPrivileged) {
            throw new ForbiddenException(
                "You are not allowed to delete this event",
            );
        }

        await this.eventRepository.delete(id);

        await this.outbox.publish({
            aggregateType: "event",
            aggregateId: id,
            eventType: OUTBOX_EVENT_TYPES.eventDeleted,
            payload: {
                id,
                deletedBy: userId,
                deletedAt: new Date(),
            },
        });

        this.logger.log(`Event deleted: ${id} by user ${userId}`);
    }

    async register(eventId: string, userId: string) {
        await this.registrationService.register(eventId, userId);
    }

    async cancelRegistration(eventId: string, userId: string) {
        await this.registrationService.cancelRegistration(eventId, userId);
    }

    async getRegistrations(eventId: string, query: PaginationQueryDto) {
        return this.registrationService.getRegistrations(eventId, query);
    }

    async swipe(userId: string, dto: SwipeEventDto) {
        await this.swipeService.recordSwipe(userId, dto);
    }

    async getNextSwipe(userId: string, quartierId: string) {
        return this.swipeService.getNextSwipe(userId, quartierId);
    }

    private toEventResponse(event: EventDocument & { _id?: ObjectId }) {
        const { _id, ...rest } = event;
        return { id: _id?.toString(), ...rest };
    }
}
