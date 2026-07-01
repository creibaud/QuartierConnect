import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ContractsService } from "../contracts/contracts.service";
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
    ) {}

    async request(serviceId: string, initiatorId: string) {
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
        return this.bookingModel.create({
            serviceId,
            initiatorId,
            payerId,
            payeeId,
            pointsAmount: amount,
            status: BookingStatus.PENDING,
        });
    }

    async accept(bookingId: string, userId: string) {
        const booking = await this.bookingModel.findById(bookingId);
        if (!booking) throw new NotFoundException("Booking not found");
        const service = await this.serviceModel.findById(booking.serviceId);
        if (!service) throw new NotFoundException("Service not found");
        if (service.createdBy !== userId) {
            throw new ForbiddenException("Only the service owner can accept");
        }
        if (booking.status !== BookingStatus.PENDING) {
            throw new BadRequestException("Booking is not pending");
        }

        const content = this.renderContent(service, booking);
        const contract = await this.contractsService.createServiceContract({
            title: `Service contract — ${service.title}`,
            content,
            serviceId: String(service._id),
            bookingId: String(booking._id),
            signatories: [booking.payerId, booking.payeeId],
            pointsAmount: booking.pointsAmount,
            createdBy: userId,
        });
        await this.pointsService.reserveServicePayment({
            contractId: String(contract._id),
            payerId: booking.payerId,
            payeeId: booking.payeeId,
            amount: booking.pointsAmount,
            note: `Service payment: ${service.title}`,
        });
        booking.status = BookingStatus.ACCEPTED;
        booking.contractId = String(contract._id);
        await booking.save();
        return booking;
    }

    async decline(bookingId: string, userId: string) {
        const booking = await this.bookingModel.findById(bookingId);
        if (!booking) throw new NotFoundException("Booking not found");
        const service = await this.serviceModel.findById(booking.serviceId);
        if (!service) throw new NotFoundException("Service not found");
        if (service.createdBy !== userId) {
            throw new ForbiddenException("Only the service owner can decline");
        }
        if (booking.status !== BookingStatus.PENDING) {
            throw new BadRequestException("Booking is not pending");
        }
        booking.status = BookingStatus.DECLINED;
        await booking.save();
        return booking;
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

        if (booking.status === BookingStatus.PENDING) {
            if (userId !== booking.initiatorId) {
                throw new ForbiddenException(
                    "Only the initiator can cancel a pending booking",
                );
            }
        } else if (booking.status === BookingStatus.ACCEPTED) {
            if (booking.contractId) {
                await this.contractsService.cancelContract(booking.contractId);
                await this.pointsService.cancelServicePayment(
                    booking.contractId,
                );
            }
        } else {
            throw new BadRequestException("Booking cannot be cancelled");
        }
        booking.status = BookingStatus.CANCELLED;
        await booking.save();
        return booking;
    }

    async findForUser(userId: string) {
        const owned = await this.serviceModel
            .find({ createdBy: userId })
            .select("_id")
            .lean();
        const ownedIds = owned.map((s) => s._id);
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

    @OnEvent("contract.fully_signed")
    async onContractFullySigned(payload: {
        contractId: string;
        bookingId: string;
    }) {
        const booking = await this.bookingModel.findById(payload.bookingId);
        if (!booking) return;
        if (booking.status !== BookingStatus.ACCEPTED) return;
        booking.status = BookingStatus.COMPLETED;
        await booking.save();
    }

    private renderContent(
        service: ServiceDocument,
        booking: ServiceBookingDocument,
    ): string {
        return [
            `Service contract for "${service.title}".`,
            `Description: ${service.description}.`,
            `Payer: ${booking.payerId}. Payee: ${booking.payeeId}.`,
            `Amount: ${booking.pointsAmount} points.`,
            `Date: ${new Date().toISOString()}.`,
        ].join("\n");
    }
}
