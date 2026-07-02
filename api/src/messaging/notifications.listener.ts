import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
    BOOKING_ACCEPTED_EVENT,
    BOOKING_CANCELLED_EVENT,
    BOOKING_CREATED_EVENT,
    BOOKING_DECLINED_EVENT,
    BookingLifecycleEvent,
    CONTRACT_FULLY_SIGNED_EVENT,
    CONTRACT_SIGNED_EVENT,
    ContractFullySignedEvent,
    ContractSignedEvent,
    NotificationType,
    POINTS_SETTLED_EVENT,
    PointsSettledEvent,
} from "../common/notification-events";
import { MessagingGateway } from "./messaging.gateway";

@Injectable()
export class NotificationsListener {
    constructor(private readonly gateway: MessagingGateway) {}

    @OnEvent(BOOKING_CREATED_EVENT)
    onBookingCreated(event: BookingLifecycleEvent) {
        this.notifyBookingCounterpart(BOOKING_CREATED_EVENT, event);
    }

    @OnEvent(BOOKING_ACCEPTED_EVENT)
    onBookingAccepted(event: BookingLifecycleEvent) {
        this.notifyBookingCounterpart(BOOKING_ACCEPTED_EVENT, event);
    }

    @OnEvent(BOOKING_DECLINED_EVENT)
    onBookingDeclined(event: BookingLifecycleEvent) {
        this.notifyBookingCounterpart(BOOKING_DECLINED_EVENT, event);
    }

    @OnEvent(BOOKING_CANCELLED_EVENT)
    onBookingCancelled(event: BookingLifecycleEvent) {
        this.notifyBookingCounterpart(BOOKING_CANCELLED_EVENT, event);
    }

    @OnEvent(CONTRACT_SIGNED_EVENT)
    onContractSigned(event: ContractSignedEvent) {
        const otherSignatories = event.signatories.filter(
            (signatoryId) => signatoryId !== event.signerId,
        );
        this.gateway.sendNotification(otherSignatories, CONTRACT_SIGNED_EVENT, {
            contractId: event.contractId,
            bookingId: event.bookingId,
            serviceTitle: event.serviceTitle,
            amount: event.amount,
            actorName: event.actorName,
        });
    }

    @OnEvent(CONTRACT_FULLY_SIGNED_EVENT)
    onContractFullySigned(event: ContractFullySignedEvent) {
        this.gateway.sendNotification(
            event.signatories ?? [],
            CONTRACT_FULLY_SIGNED_EVENT,
            {
                contractId: event.contractId,
                bookingId: event.bookingId,
                serviceTitle: event.serviceTitle,
                amount: event.amount,
            },
        );
    }

    @OnEvent(POINTS_SETTLED_EVENT)
    onPointsSettled(event: PointsSettledEvent) {
        this.gateway.sendNotification(
            [event.payerId, event.payeeId],
            POINTS_SETTLED_EVENT,
            {
                contractId: event.contractId,
                amount: event.amount,
            },
        );
    }

    private notifyBookingCounterpart(
        type: NotificationType,
        event: BookingLifecycleEvent,
    ) {
        const counterpartId =
            event.actorId === event.ownerId ? event.initiatorId : event.ownerId;
        this.gateway.sendNotification([counterpartId], type, {
            bookingId: event.bookingId,
            serviceTitle: event.serviceTitle,
            amount: event.amount,
            actorName: event.actorName,
        });
    }
}
