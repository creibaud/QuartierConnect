import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SwipeEventDto } from "src/modules/events/dto/swipe-event.dto";
import type { IEventsRepository } from "src/modules/events/event.repository";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";

/**
 * EventSwipeService - Gère le système de swipe (like/pass) pour les événements
 * Séparation de concerns: Recommandations interactives
 */
@Injectable()
export class EventSwipeService {
    private readonly logger = new Logger(EventSwipeService.name);

    constructor(
        @Inject("IEventsRepository")
        private readonly eventRepository: IEventsRepository,
        private readonly outbox: OutboxService,
    ) {}

    async recordSwipe(userId: string, dto: SwipeEventDto) {
        const now = new Date();

        // Enregistrer le swipe
        await this.eventRepository.recordSwipe(
            dto.eventId,
            userId,
            dto.liked ? "like" : "pass",
        );

        // Publier événement seulement si like
        if (!dto.liked) {
            this.logger.log(`User ${userId} disliked event ${dto.eventId}`);
            return;
        }

        await this.outbox.publish({
            aggregateType: "event_swipe",
            aggregateId: `${dto.eventId}:${userId}`,
            eventType: OUTBOX_EVENT_TYPES.eventSwipeLiked,
            payload: {
                eventId: dto.eventId,
                userId,
                liked: true,
                swipedAt: now,
            },
        });

        this.logger.log(`User ${userId} liked event ${dto.eventId}`);
    }

    async getNextSwipe(userId: string, _quartierId: string) {
        return this.eventRepository.getNextSwipe(userId, 1);
    }

    async hasUserSwiped(eventId: string, userId: string): Promise<boolean> {
        return this.eventRepository.hasUserSwiped(eventId, userId);
    }
}
