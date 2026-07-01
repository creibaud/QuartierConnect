import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { BookingStatus } from "./schemas/service-booking.schema";

function paidService(over: Record<string, unknown> = {}) {
    return {
        _id: "svc1",
        type: "paid",
        status: "active",
        direction: "offer",
        createdBy: "owner",
        duration: 60,
        pointsMultiplier: 1,
        pointsAmount: undefined,
        title: "Gardening",
        description: "Weeding",
        ...over,
    };
}

function makeService(svc: any) {
    return { findById: jest.fn().mockResolvedValue(svc) };
}

describe("BookingsService.request", () => {
    it("rejects booking a non-paid service", async () => {
        const bookingModel: any = {
            findOne: jest.fn().mockResolvedValue(null),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService({ type: "free" })) as any,
            {} as any,
            {} as any,
        );
        await expect(svc.request("svc1", "initiator")).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it("rejects the owner booking their own service", async () => {
        const bookingModel: any = {
            findOne: jest.fn().mockResolvedValue(null),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await expect(svc.request("svc1", "owner")).rejects.toBeInstanceOf(
            ForbiddenException,
        );
    });

    it("freezes the derived price and payer=initiator for an offer", async () => {
        const created: any = {};
        const bookingModel: any = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest
                .fn()
                .mockImplementation((doc: Record<string, unknown>) => {
                    Object.assign(created, doc);
                    return { ...doc, _id: "b1" };
                }),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService({ pointsMultiplier: 1.5 })) as any,
            {} as any,
            {} as any,
        );
        await svc.request("svc1", "initiator");
        expect(created.payerId).toBe("initiator");
        expect(created.payeeId).toBe("owner");
        expect(created.pointsAmount).toBe(3); // ceil(base(60)=2 * 1.5)
        expect(created.status).toBe(BookingStatus.PENDING);
    });
});

describe("BookingsService.accept", () => {
    it("generates a contract, reserves payment, moves to accepted", async () => {
        const claimed: any = {
            _id: "b1",
            serviceId: "svc1",
            status: BookingStatus.ACCEPTED,
            payerId: "initiator",
            payeeId: "owner",
            pointsAmount: 3,
            save: jest.fn().mockResolvedValue(undefined),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue({
                _id: "b1",
                serviceId: "svc1",
                status: BookingStatus.PENDING,
            }),
            findOneAndUpdate: jest.fn().mockResolvedValue(claimed),
        };
        const contracts: any = {
            createServiceContract: jest.fn().mockResolvedValue({ _id: "c1" }),
        };
        const points: any = {
            reserveServicePayment: jest.fn().mockResolvedValue(undefined),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
        );
        await svc.accept("b1", "owner");
        expect(contracts.createServiceContract).toHaveBeenCalledWith(
            expect.objectContaining({
                serviceId: "svc1",
                bookingId: "b1",
                signatories: ["initiator", "owner"],
                pointsAmount: 3,
            }),
        );
        expect(points.reserveServicePayment).toHaveBeenCalledWith(
            expect.objectContaining({ contractId: "c1", amount: 3 }),
        );
        expect(claimed.status).toBe(BookingStatus.ACCEPTED);
        expect(claimed.contractId).toBe("c1");
    });

    it("rejects accept by a non-owner without claiming the booking", async () => {
        const booking: any = {
            serviceId: "svc1",
            status: BookingStatus.PENDING,
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
            findOneAndUpdate: jest.fn(),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await expect(svc.accept("b1", "stranger")).rejects.toBeInstanceOf(
            ForbiddenException,
        );
        expect(bookingModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("rejects and mints nothing when it loses the claim race", async () => {
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue({
                _id: "b1",
                serviceId: "svc1",
                status: BookingStatus.PENDING,
            }),
            findOneAndUpdate: jest.fn().mockResolvedValue(null),
        };
        const contracts: any = {
            createServiceContract: jest.fn(),
        };
        const points: any = {
            reserveServicePayment: jest.fn(),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
        );
        await expect(svc.accept("b1", "owner")).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(contracts.createServiceContract).not.toHaveBeenCalled();
        expect(points.reserveServicePayment).not.toHaveBeenCalled();
    });
});

describe("BookingsService.decline", () => {
    it("declines a pending booking as the owner", async () => {
        const booking: any = {
            serviceId: "svc1",
            status: BookingStatus.PENDING,
            save: jest.fn().mockResolvedValue(undefined),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await svc.decline("b1", "owner");
        expect(booking.status).toBe(BookingStatus.DECLINED);
        expect(booking.save).toHaveBeenCalled();
    });

    it("rejects decline by a non-owner", async () => {
        const booking: any = {
            serviceId: "svc1",
            status: BookingStatus.PENDING,
            save: jest.fn(),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await expect(svc.decline("b1", "stranger")).rejects.toBeInstanceOf(
            ForbiddenException,
        );
        expect(booking.save).not.toHaveBeenCalled();
    });

    it("rejects declining a booking that is not pending", async () => {
        const booking: any = {
            serviceId: "svc1",
            status: BookingStatus.ACCEPTED,
            save: jest.fn(),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await expect(svc.decline("b1", "owner")).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(booking.save).not.toHaveBeenCalled();
    });
});

describe("BookingsService.cancel", () => {
    it("cancels a pending booking as the initiator", async () => {
        const booking: any = {
            serviceId: "svc1",
            status: BookingStatus.PENDING,
            initiatorId: "initiator",
            save: jest.fn().mockResolvedValue(undefined),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await svc.cancel("b1", "initiator");
        expect(booking.status).toBe(BookingStatus.CANCELLED);
        expect(booking.save).toHaveBeenCalled();
    });

    it("rejects cancelling a pending booking as the owner (non-initiator)", async () => {
        const booking: any = {
            serviceId: "svc1",
            status: BookingStatus.PENDING,
            initiatorId: "initiator",
            save: jest.fn(),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await expect(svc.cancel("b1", "owner")).rejects.toBeInstanceOf(
            ForbiddenException,
        );
        expect(booking.save).not.toHaveBeenCalled();
    });

    it("unwinds contract and payment when cancelling an accepted booking", async () => {
        const booking: any = {
            serviceId: "svc1",
            status: BookingStatus.ACCEPTED,
            initiatorId: "initiator",
            contractId: "c1",
            save: jest.fn().mockResolvedValue(undefined),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
        };
        const contracts: any = {
            cancelContract: jest.fn().mockResolvedValue(undefined),
        };
        const points: any = {
            cancelServicePayment: jest.fn().mockResolvedValue(undefined),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
        );
        await svc.cancel("b1", "initiator");
        expect(contracts.cancelContract).toHaveBeenCalledWith("c1");
        expect(points.cancelServicePayment).toHaveBeenCalledWith("c1");
        expect(booking.status).toBe(BookingStatus.CANCELLED);
        expect(booking.save).toHaveBeenCalled();
    });

    it.each([
        BookingStatus.DECLINED,
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
    ])("rejects cancelling a booking that is %s", async (status) => {
        const booking: any = {
            serviceId: "svc1",
            status,
            initiatorId: "initiator",
            save: jest.fn(),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await expect(svc.cancel("b1", "initiator")).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(booking.save).not.toHaveBeenCalled();
    });
});

describe("BookingsService.onContractFullySigned", () => {
    it("completes an accepted booking", async () => {
        const booking: any = {
            status: BookingStatus.ACCEPTED,
            save: jest.fn().mockResolvedValue(undefined),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await svc.onContractFullySigned({
            contractId: "c1",
            bookingId: "b1",
        });
        expect(booking.status).toBe(BookingStatus.COMPLETED);
        expect(booking.save).toHaveBeenCalled();
    });

    it("leaves a non-accepted booking untouched", async () => {
        const booking: any = {
            status: BookingStatus.PENDING,
            save: jest.fn(),
        };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(booking),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
        );
        await svc.onContractFullySigned({
            contractId: "c1",
            bookingId: "b1",
        });
        expect(booking.status).toBe(BookingStatus.PENDING);
        expect(booking.save).not.toHaveBeenCalled();
    });
});
