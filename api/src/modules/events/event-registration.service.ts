import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    Logger,
} from "@nestjs/common";
import type { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import type { IEventsRepository } from "src/modules/events/event.repository";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";

/**
 * EventRegistrationService - Gère les inscriptions/annulations à des événements
 * Séparation de concerns: Métier des inscriptions
 */
@Injectable()
export class EventRegistrationService {
    private readonly logger = new Logger(EventRegistrationService.name);

    constructor(
        @Inject("IEventsRepository")
        private readonly eventRepository: IEventsRepository,
        private readonly outbox: OutboxService,
    ) {}

    async register(eventId: string, userId: string) {
        // Vérifier capacité
        const registrations = await this.eventRepository.getRegistrations(
            eventId,
            1,
            1000,
        );
        const event = await this.eventRepository.findById(eventId);

        if (!event) throw new Error("Event not found");

        if (
            event.maxCapacity !== undefined &&
            event.registrationCount >= event.maxCapacity
        ) {
            throw new BadRequestException(
                "Event has reached its maximum capacity",
            );
        }

        // Vérifier déjà inscrit
        const alreadyRegistered = registrations.data.some(
            (r) => r.userId === userId && r.status !== "cancelled",
        );

        if (alreadyRegistered) {
            throw new ConflictException(
                "You are already registered for this event",
            );
        }

        // Inscrire
        await this.eventRepository.registerUser(eventId, userId);

        // Publier événement
        await this.outbox.publish({
            aggregateType: "event_registration",
            aggregateId: `${eventId}:${userId}`,
            eventType: OUTBOX_EVENT_TYPES.eventRegistrationCreated,
            payload: {
                eventId,
                userId,
                createdAt: new Date(),
            },
        });

        this.logger.log(`User ${userId} registered for event ${eventId}`);
    }

    async cancelRegistration(eventId: string, userId: string) {
        await this.eventRepository.cancelRegistration(eventId, userId);

        await this.outbox.publish({
            aggregateType: "event_registration",
            aggregateId: `${eventId}:${userId}`,
            eventType: OUTBOX_EVENT_TYPES.eventRegistrationCancelled,
            payload: {
                eventId,
                userId,
                cancelledAt: new Date(),
            },
        });

        this.logger.log(
            `User ${userId} cancelled registration for event ${eventId}`,
        );
    }

    async getRegistrations(eventId: string, query: PaginationQueryDto) {
        const { page = 1, limit = 10 } = query;

        const result = await this.eventRepository.getRegistrations(
            eventId,
            page,
            limit,
        );

        return {
            data: result.data.map((reg) => ({
                ...reg,
                id: (reg._id as any)?.toString(),
                _id: undefined,
            })),
            meta: {
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit),
            },
        };
    }

    async getRegistrationCount(eventId: string): Promise<number> {
        return this.eventRepository.getRegistrationCount(eventId);
    }
}
