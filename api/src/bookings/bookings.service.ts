import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import {
    BOOKING_ACCEPTED_EVENT,
    BOOKING_CANCELLED_EVENT,
    BOOKING_CREATED_EVENT,
    BOOKING_DECLINED_EVENT,
    BookingLifecycleEvent,
    CONTRACT_FULLY_SIGNED_EVENT,
} from "../common/notification-events";
import { ContractsService } from "../contracts/contracts.service";
import { formatFrenchDate, formatPointsAmount } from "../contracts/lib/format";
import { PointsService } from "../points/points.service";
import { Service, ServiceDocument } from "../services/schemas/service.schema";
import { resolveParties } from "./lib/parties";
import { computeServicePrice } from "./lib/pricing";
import {
    BookingStatus,
    ServiceBooking,
    ServiceBookingDocument,
} from "./schemas/service-booking.schema";

@Injectable()
export class BookingsService {
    constructor(
        @InjectModel(ServiceBooking.name)
        private readonly bookingModel: Model<ServiceBookingDocument>,
        @InjectModel(Service.name)
        private readonly serviceModel: Model<ServiceDocument>,
        private readonly contractsService: ContractsService,
        private readonly pointsService: PointsService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async request(serviceId: string, initiatorId: string) {
        // Reject non-ObjectId input before it reaches a Mongo query, so a
        // crafted value cannot be smuggled into findById/findOne.
        if (!isValidObjectId(serviceId)) {
            throw new NotFoundException("Service not found");
        }
        const service = await this.serviceModel.findById(serviceId);
        if (!service) throw new NotFoundException("Service not found");
        if (service.type !== "paid") {
            throw new BadRequestException("Service is not paid");
        }
        if (service.status === "closed") {
            throw new BadRequestException("Service is closed");
        }
        if (service.createdBy === initiatorId) {
            throw new ForbiddenException("Cannot book your own service");
        }
        const existing = await this.bookingModel.findOne({
            serviceId,
            initiatorId,
            status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
        });
        if (existing) {
            throw new BadRequestException(
                "You already have an active booking for this service",
            );
        }
        const { payerId, payeeId } = resolveParties(
            service.direction,
            service.createdBy,
            initiatorId,
        );
        const amount = computeServicePrice({
            durationMinutes: service.duration,
            pointsMultiplier: service.pointsMultiplier,
            override: service.pointsAmount,
        });
        const booking = await this.bookingModel.create({
            serviceId,
            initiatorId,
            payerId,
            payeeId,
            pointsAmount: amount,
            status: BookingStatus.PENDING,
        });
        this.eventEmitter.emit(BOOKING_CREATED_EVENT, {
            bookingId: String(booking._id),
            ownerId: service.createdBy,
            initiatorId,
            actorId: initiatorId,
            serviceTitle: service.title,
            amount,
        } satisfies BookingLifecycleEvent);
        return booking;
    }

    async accept(bookingId: string, userId: string) {
        const booking = await this.bookingModel.findById(bookingId);
        if (!booking) throw new NotFoundException("Booking not found");
        const service = await this.serviceModel.findById(booking.serviceId);
        if (!service) throw new NotFoundException("Service not found");
        if (service.createdBy !== userId) {
            throw new ForbiddenException("Only the service owner can accept");
        }

        // Atomically claim the booking so exactly one concurrent accept wins
        // the PENDING→ACCEPTED transition. The loser gets null and never mints
        // a second contract or duplicate pending payment for the same booking.
        const claimed = await this.bookingModel.findOneAndUpdate(
            { _id: bookingId, status: BookingStatus.PENDING },
            { $set: { status: BookingStatus.ACCEPTED } },
            { new: true },
        );
        if (!claimed) throw new BadRequestException("Booking is not pending");

        const partyNames = await this.contractsService.resolveNames([
            claimed.payerId,
            claimed.payeeId,
        ]);
        const content = this.renderContent(service, claimed, partyNames);
        // The post-claim steps form a small saga: any failure unwinds the
        // minted contract/payment and releases the claim so the owner can
        // simply retry, instead of leaving a signable orphan behind.
        let contractId: string | null = null;
        let linked: ServiceBookingDocument | null = null;
        try {
            const contract = await this.contractsService.createServiceContract({
                title: `Contrat de service — ${service.title}`,
                content,
                serviceId: String(service._id),
                bookingId: String(claimed._id),
                signatories: [claimed.payerId, claimed.payeeId],
                pointsAmount: claimed.pointsAmount,
                createdBy: userId,
            });
            contractId = String(contract._id);
            await this.pointsService.reserveServicePayment({
                contractId,
                payerId: claimed.payerId,
                payeeId: claimed.payeeId,
                amount: claimed.pointsAmount,
                note: `Service payment: ${service.title}`,
            });
            // Guarded link: a booking cancelled while the contract was being
            // minted must not end up pointing at a live contract.
            linked = await this.bookingModel.findOneAndUpdate(
                {
                    _id: bookingId,
                    status: BookingStatus.ACCEPTED,
                    contractId: null,
                },
                { $set: { contractId } },
                { new: true },
            );
        } catch (err) {
            await this.compensateAccept(bookingId, contractId);
            throw err;
        }
        if (!linked) {
            await this.compensateAccept(bookingId, contractId);
            throw new BadRequestException("Booking is not pending");
        }
        this.eventEmitter.emit(BOOKING_ACCEPTED_EVENT, {
            bookingId: String(linked._id),
            ownerId: userId,
            initiatorId: linked.initiatorId,
            actorId: userId,
            serviceTitle: service.title,
            amount: linked.pointsAmount,
            actorName: partyNames[userId],
        } satisfies BookingLifecycleEvent);
        return linked;
    }

    // Best-effort unwind of a half-completed accept: kill the minted
    // contract and its pending payment, then release the ACCEPTED claim so
    // the booking becomes acceptable again.
    private async compensateAccept(
        bookingId: string,
        contractId: string | null,
    ): Promise<void> {
        if (contractId) {
            await this.contractsService
                .cancelContract(contractId)
                .catch(() => undefined);
            await this.pointsService
                .cancelServicePayment(contractId)
                .catch(() => undefined);
        }
        await this.bookingModel
            .updateOne(
                {
                    _id: bookingId,
                    status: BookingStatus.ACCEPTED,
                    contractId: null,
                },
                { $set: { status: BookingStatus.PENDING } },
            )
            .catch(() => undefined);
    }

    async decline(bookingId: string, userId: string) {
        const booking = await this.bookingModel.findById(bookingId);
        if (!booking) throw new NotFoundException("Booking not found");
        const service = await this.serviceModel.findById(booking.serviceId);
        if (!service) throw new NotFoundException("Service not found");
        if (service.createdBy !== userId) {
            throw new ForbiddenException("Only the service owner can decline");
        }
        // Atomic claim: a booking accepted concurrently must not be clobbered
        // to DECLINED while its contract and pending payment stay alive.
        const claimed = await this.bookingModel.findOneAndUpdate(
            { _id: bookingId, status: BookingStatus.PENDING },
            { $set: { status: BookingStatus.DECLINED } },
            { new: true },
        );
        if (!claimed) throw new BadRequestException("Booking is not pending");
        this.eventEmitter.emit(BOOKING_DECLINED_EVENT, {
            bookingId: String(claimed._id),
            ownerId: userId,
            initiatorId: claimed.initiatorId,
            actorId: userId,
            serviceTitle: service.title,
            amount: claimed.pointsAmount,
        } satisfies BookingLifecycleEvent);
        return claimed;
    }

    async cancel(bookingId: string, userId: string) {
        const booking = await this.bookingModel.findById(bookingId);
        if (!booking) throw new NotFoundException("Booking not found");
        const service = await this.serviceModel.findById(booking.serviceId);
        if (!service) throw new NotFoundException("Service not found");
        const isParty =
            userId === booking.initiatorId || userId === service.createdBy;
        if (!isParty)
            throw new ForbiddenException("Not a party to this booking");

        if (
            booking.status === BookingStatus.PENDING &&
            userId !== booking.initiatorId
        ) {
            throw new ForbiddenException(
                "Only the initiator can cancel a pending booking",
            );
        }
        // The initiator can cancel their pending or accepted booking; the
        // owner only an accepted one (a pending booking is declined instead).
        const cancellableStatuses =
            userId === booking.initiatorId
                ? [BookingStatus.PENDING, BookingStatus.ACCEPTED]
                : [BookingStatus.ACCEPTED];
        // Atomic claim: a transition that a concurrent accept, decline or
        // final signature already performed must not be clobbered.
        const claimed = await this.bookingModel.findOneAndUpdate(
            { _id: bookingId, status: { $in: cancellableStatuses } },
            { $set: { status: BookingStatus.CANCELLED } },
            { new: true },
        );
        if (!claimed) {
            throw new BadRequestException("Booking cannot be cancelled");
        }
        if (claimed.contractId) {
            try {
                await this.contractsService.cancelContract(claimed.contractId);
            } catch (err) {
                // The contract turned fully-signed while we were cancelling:
                // the money already moved, so surface the completed state
                // instead of leaving a cancelled booking behind.
                await this.bookingModel
                    .updateOne(
                        { _id: bookingId, status: BookingStatus.CANCELLED },
                        { $set: { status: BookingStatus.COMPLETED } },
                    )
                    .catch(() => undefined);
                throw err;
            }
            await this.pointsService.cancelServicePayment(claimed.contractId);
        }
        this.eventEmitter.emit(BOOKING_CANCELLED_EVENT, {
            bookingId: String(claimed._id),
            ownerId: service.createdBy,
            initiatorId: claimed.initiatorId,
            actorId: userId,
            serviceTitle: service.title,
            amount: claimed.pointsAmount,
        } satisfies BookingLifecycleEvent);
        return claimed;
    }

    async findForUser(userId: string) {
        const owned = await this.serviceModel
            .find({ createdBy: userId })
            .select("_id")
            .lean();
        const ownedIds = owned.map((s) => String(s._id));
        return this.bookingModel
            .find({
                $or: [
                    { initiatorId: userId },
                    { serviceId: { $in: ownedIds } },
                ],
            })
            .sort({ createdAt: -1 })
            .lean();
    }

    async findOne(id: string, userId: string) {
        const booking = await this.bookingModel.findById(id);
        if (!booking) throw new NotFoundException("Booking not found");
        const service = await this.serviceModel.findById(booking.serviceId);
        const isParty =
            userId === booking.initiatorId || service?.createdBy === userId;
        if (!isParty) throw new ForbiddenException("Access denied");
        return booking;
    }

    @OnEvent(CONTRACT_FULLY_SIGNED_EVENT)
    async onContractFullySigned(payload: {
        contractId: string;
        bookingId: string;
    }) {
        // Conditional update so a booking that reached a terminal state in
        // the meantime (e.g. cancelled) is never clobbered back.
        await this.bookingModel.updateOne(
            { _id: payload.bookingId, status: BookingStatus.ACCEPTED },
            { $set: { status: BookingStatus.COMPLETED } },
        );
    }

    private renderContent(
        service: ServiceDocument,
        booking: ServiceBookingDocument,
        partyNames: Record<string, string>,
    ): string {
        const payerName = partyNames[booking.payerId] ?? booking.payerId;
        const payeeName = partyNames[booking.payeeId] ?? booking.payeeId;
        const description = service.description.endsWith(".")
            ? service.description
            : `${service.description}.`;
        return [
            `Contrat de service pour « ${service.title} ».`,
            `Description : ${description}`,
            `Payeur : ${payerName}. Bénéficiaire : ${payeeName}.`,
            `Montant : ${formatPointsAmount(booking.pointsAmount)}.`,
            `Fait le ${formatFrenchDate(new Date())}.`,
        ].join("\n");
    }
}
