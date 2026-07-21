import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { BookingStatus } from "./schemas/service-booking.schema";

// A syntactically valid Mongo ObjectId so the isValidObjectId guard passes.
const SERVICE_ID = "664f1a2b3c4d5e6f7a8b9c0d";

const rejectionOf = (p: Promise<unknown>): Promise<Error> =>
    p.then(
        () => {
            throw new Error("expected the promise to reject");
        },
        (err: unknown) => err as Error,
    );

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

function makeEmitter() {
    return { emit: jest.fn() };
}

function requester(over: Record<string, unknown> = {}) {
    return { sub: "initiator", role: "resident", neighborhoodId: null, ...over };
}

function pendingBooking(over: Record<string, unknown> = {}) {
    return {
        _id: "b1",
        serviceId: "svc1",
        status: BookingStatus.PENDING,
        initiatorId: "initiator",
        payerId: "initiator",
        payeeId: "owner",
        pointsAmount: 3,
        ...over,
    };
}

describe("BookingsService.request", () => {
    it("rejects booking a non-paid service", async () => {
        const bookingModel: any = {
            findOne: jest.fn().mockResolvedValue(null),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService({ type: "free" })) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        await expect(
            svc.request(SERVICE_ID, requester()),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("rejects the owner booking their own service", async () => {
        const bookingModel: any = {
            findOne: jest.fn().mockResolvedValue(null),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        await expect(svc.request(SERVICE_ID, requester({ sub: "owner" }))).rejects.toBeInstanceOf(
            ForbiddenException,
        );
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("rejects booking a service from another quartier", async () => {
        const bookingModel: any = {
            findOne: jest.fn().mockResolvedValue(null),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService({ neighborhoodId: "nB" })) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        await expect(
            svc.request(SERVICE_ID, requester({ neighborhoodId: "nA" })),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("books a service in the caller's own quartier", async () => {
        const bookingModel: any = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest
                .fn()
                .mockImplementation((doc: Record<string, unknown>) => ({
                    ...doc,
                    _id: "b1",
                })),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService({ neighborhoodId: "nA" })) as any,
            {} as any,
            {} as any,
            makeEmitter() as any,
        );
        const booking = await svc.request(
            SERVICE_ID,
            requester({ neighborhoodId: "nA" }),
        );
        expect(booking.status).toBe(BookingStatus.PENDING);
    });

    it("lets an admin book a service outside their quartier", async () => {
        const bookingModel: any = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest
                .fn()
                .mockImplementation((doc: Record<string, unknown>) => ({
                    ...doc,
                    _id: "b1",
                })),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService({ neighborhoodId: "nB" })) as any,
            {} as any,
            {} as any,
            makeEmitter() as any,
        );
        const booking = await svc.request(
            SERVICE_ID,
            requester({ sub: "adm", role: "admin", neighborhoodId: "nA" }),
        );
        expect(booking.status).toBe(BookingStatus.PENDING);
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
            makeEmitter() as any,
        );
        await svc.request(SERVICE_ID, requester());
        expect(created.payerId).toBe("initiator");
        expect(created.payeeId).toBe("owner");
        expect(created.pointsAmount).toBe(3); // ceil(base(60)=2 * 1.5)
        expect(created.status).toBe(BookingStatus.PENDING);
    });

    it("emits booking.created after persisting the booking", async () => {
        const bookingModel: any = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest
                .fn()
                .mockImplementation((doc: Record<string, unknown>) => ({
                    ...doc,
                    _id: "b1",
                })),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        await svc.request(SERVICE_ID, requester());
        expect(emitter.emit).toHaveBeenCalledWith("booking.created", {
            bookingId: "b1",
            ownerId: "owner",
            initiatorId: "initiator",
            actorId: "initiator",
            serviceTitle: "Gardening",
            amount: 2,
        });
    });
});

describe("BookingsService.accept", () => {
    it("generates a contract, reserves payment, links it and moves to accepted", async () => {
        const claimed: any = pendingBooking({
            status: BookingStatus.ACCEPTED,
        });
        const linked: any = { ...claimed, contractId: "c1" };
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(pendingBooking()),
            findOneAndUpdate: jest
                .fn()
                .mockResolvedValueOnce(claimed)
                .mockResolvedValueOnce(linked),
        };
        const contracts: any = {
            createServiceContract: jest.fn().mockResolvedValue({ _id: "c1" }),
            resolveNames: jest.fn().mockResolvedValue({
                initiator: "Alice Martin",
                owner: "Bob Dupont",
            }),
        };
        const points: any = {
            reserveServicePayment: jest.fn().mockResolvedValue(undefined),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
            emitter as any,
        );
        const result = await svc.accept("b1", "owner");
        expect(bookingModel.findOneAndUpdate).toHaveBeenNthCalledWith(
            1,
            { _id: "b1", status: BookingStatus.PENDING },
            { $set: { status: BookingStatus.ACCEPTED } },
            { new: true },
        );
        expect(contracts.resolveNames).toHaveBeenCalledWith([
            "initiator",
            "owner",
        ]);
        expect(contracts.createServiceContract).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Contrat de service — Gardening",
                serviceId: "svc1",
                bookingId: "b1",
                signatories: ["initiator", "owner"],
                pointsAmount: 3,
            }),
        );
        const { content } = contracts.createServiceContract.mock.calls[0][0];
        expect(content).toContain("Contrat de service pour « Gardening »");
        expect(content).toContain(
            "Payeur : Alice Martin. Bénéficiaire : Bob Dupont.",
        );
        expect(content).toContain("Montant : 3 points.");
        expect(content).not.toContain("initiator");
        expect(points.reserveServicePayment).toHaveBeenCalledWith(
            expect.objectContaining({ contractId: "c1", amount: 3 }),
        );
        expect(bookingModel.findOneAndUpdate).toHaveBeenNthCalledWith(
            2,
            {
                _id: "b1",
                status: BookingStatus.ACCEPTED,
                contractId: null,
            },
            { $set: { contractId: "c1" } },
            { new: true },
        );
        expect(result).toBe(linked);
        expect(emitter.emit).toHaveBeenCalledWith("booking.accepted", {
            bookingId: "b1",
            ownerId: "owner",
            initiatorId: "initiator",
            actorId: "owner",
            serviceTitle: "Gardening",
            amount: 3,
            actorName: "Bob Dupont",
        });
    });

    it("rejects accept by a non-owner without claiming the booking", async () => {
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(pendingBooking()),
            findOneAndUpdate: jest.fn(),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            makeEmitter() as any,
        );
        await expect(svc.accept("b1", "stranger")).rejects.toBeInstanceOf(
            ForbiddenException,
        );
        expect(bookingModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("rejects, mints nothing and compensates nothing when it loses the claim race", async () => {
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(pendingBooking()),
            findOneAndUpdate: jest.fn().mockResolvedValue(null),
            updateOne: jest.fn(),
        };
        const contracts: any = {
            createServiceContract: jest.fn(),
        };
        const points: any = {
            reserveServicePayment: jest.fn(),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
            emitter as any,
        );
        const error = await rejectionOf(svc.accept("b1", "owner"));
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe("Booking is not pending");
        expect(contracts.createServiceContract).not.toHaveBeenCalled();
        expect(points.reserveServicePayment).not.toHaveBeenCalled();
        expect(bookingModel.updateOne).not.toHaveBeenCalled();
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("unwinds the contract and releases the claim when payment reservation fails", async () => {
        const reserveFailure = new Error("Insufficient balance");
        const claimed: any = pendingBooking({
            status: BookingStatus.ACCEPTED,
        });
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(pendingBooking()),
            findOneAndUpdate: jest.fn().mockResolvedValue(claimed),
            updateOne: jest.fn().mockResolvedValue(undefined),
        };
        const contracts: any = {
            createServiceContract: jest.fn().mockResolvedValue({ _id: "c1" }),
            resolveNames: jest.fn().mockResolvedValue({}),
            cancelContract: jest.fn().mockResolvedValue(undefined),
        };
        const points: any = {
            reserveServicePayment: jest.fn().mockRejectedValue(reserveFailure),
            cancelServicePayment: jest.fn().mockResolvedValue(undefined),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
            emitter as any,
        );
        await expect(svc.accept("b1", "owner")).rejects.toBe(reserveFailure);
        expect(contracts.cancelContract).toHaveBeenCalledWith("c1");
        expect(points.cancelServicePayment).toHaveBeenCalledWith("c1");
        expect(bookingModel.updateOne).toHaveBeenCalledWith(
            {
                _id: "b1",
                status: BookingStatus.ACCEPTED,
                contractId: null,
            },
            { $set: { status: BookingStatus.PENDING } },
        );
        expect(bookingModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("compensates and rejects when the booking was cancelled during contract minting", async () => {
        const claimed: any = pendingBooking({
            status: BookingStatus.ACCEPTED,
        });
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(pendingBooking()),
            findOneAndUpdate: jest
                .fn()
                .mockResolvedValueOnce(claimed)
                .mockResolvedValueOnce(null),
            updateOne: jest.fn().mockResolvedValue(undefined),
        };
        const contracts: any = {
            createServiceContract: jest.fn().mockResolvedValue({ _id: "c1" }),
            resolveNames: jest.fn().mockResolvedValue({}),
            cancelContract: jest.fn().mockResolvedValue(undefined),
        };
        const points: any = {
            reserveServicePayment: jest.fn().mockResolvedValue(undefined),
            cancelServicePayment: jest.fn().mockResolvedValue(undefined),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
            emitter as any,
        );
        const error = await rejectionOf(svc.accept("b1", "owner"));
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe("Booking is not pending");
        expect(contracts.cancelContract).toHaveBeenCalledWith("c1");
        expect(points.cancelServicePayment).toHaveBeenCalledWith("c1");
        expect(bookingModel.updateOne).toHaveBeenCalledWith(
            {
                _id: "b1",
                status: BookingStatus.ACCEPTED,
                contractId: null,
            },
            { $set: { status: BookingStatus.PENDING } },
        );
        expect(emitter.emit).not.toHaveBeenCalled();
    });
});

describe("BookingsService.decline", () => {
    it("declines a pending booking as the owner and notifies the initiator", async () => {
        const claimed: any = pendingBooking({
            status: BookingStatus.DECLINED,
            pointsAmount: 2,
        });
        const bookingModel: any = {
            findById: jest
                .fn()
                .mockResolvedValue(pendingBooking({ pointsAmount: 2 })),
            findOneAndUpdate: jest.fn().mockResolvedValue(claimed),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        const result = await svc.decline("b1", "owner");
        expect(bookingModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: "b1", status: BookingStatus.PENDING },
            { $set: { status: BookingStatus.DECLINED } },
            { new: true },
        );
        expect(result).toBe(claimed);
        expect(emitter.emit).toHaveBeenCalledWith("booking.declined", {
            bookingId: "b1",
            ownerId: "owner",
            initiatorId: "initiator",
            actorId: "owner",
            serviceTitle: "Gardening",
            amount: 2,
        });
    });

    it("rejects decline by a non-owner without claiming the booking", async () => {
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(pendingBooking()),
            findOneAndUpdate: jest.fn(),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        await expect(svc.decline("b1", "stranger")).rejects.toBeInstanceOf(
            ForbiddenException,
        );
        expect(bookingModel.findOneAndUpdate).not.toHaveBeenCalled();
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("rejects declining an already accepted booking without emitting", async () => {
        const bookingModel: any = {
            findById: jest
                .fn()
                .mockResolvedValue(
                    pendingBooking({ status: BookingStatus.ACCEPTED }),
                ),
            findOneAndUpdate: jest.fn().mockResolvedValue(null),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        const error = await rejectionOf(svc.decline("b1", "owner"));
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe("Booking is not pending");
        expect(bookingModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: "b1", status: BookingStatus.PENDING },
            { $set: { status: BookingStatus.DECLINED } },
            { new: true },
        );
        expect(emitter.emit).not.toHaveBeenCalled();
    });
});

describe("BookingsService.cancel", () => {
    it("cancels a pending booking as the initiator and notifies the owner", async () => {
        const claimed: any = pendingBooking({
            status: BookingStatus.CANCELLED,
            pointsAmount: 2,
        });
        const bookingModel: any = {
            findById: jest
                .fn()
                .mockResolvedValue(pendingBooking({ pointsAmount: 2 })),
            findOneAndUpdate: jest.fn().mockResolvedValue(claimed),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        const result = await svc.cancel("b1", "initiator");
        expect(bookingModel.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: "b1",
                status: {
                    $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED],
                },
            },
            { $set: { status: BookingStatus.CANCELLED } },
            { new: true },
        );
        expect(result).toBe(claimed);
        expect(emitter.emit).toHaveBeenCalledWith("booking.cancelled", {
            bookingId: "b1",
            ownerId: "owner",
            initiatorId: "initiator",
            actorId: "initiator",
            serviceTitle: "Gardening",
            amount: 2,
        });
    });

    it("rejects cancelling a pending booking as the owner (non-initiator)", async () => {
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(pendingBooking()),
            findOneAndUpdate: jest.fn(),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        const error = await rejectionOf(svc.cancel("b1", "owner"));
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
            "Only the initiator can cancel a pending booking",
        );
        expect(bookingModel.findOneAndUpdate).not.toHaveBeenCalled();
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("unwinds contract and payment when cancelling an accepted booking", async () => {
        const claimed: any = pendingBooking({
            status: BookingStatus.CANCELLED,
            contractId: "c1",
            pointsAmount: 2,
        });
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(
                pendingBooking({
                    status: BookingStatus.ACCEPTED,
                    contractId: "c1",
                    pointsAmount: 2,
                }),
            ),
            findOneAndUpdate: jest.fn().mockResolvedValue(claimed),
        };
        const contracts: any = {
            cancelContract: jest.fn().mockResolvedValue(undefined),
        };
        const points: any = {
            cancelServicePayment: jest.fn().mockResolvedValue(true),
            isServicePaymentCompleted: jest.fn(),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
            emitter as any,
        );
        const result = await svc.cancel("b1", "initiator");
        // The payment is voided first, then the contract is cancelled.
        expect(points.cancelServicePayment).toHaveBeenCalledWith("c1");
        expect(contracts.cancelContract).toHaveBeenCalledWith("c1");
        expect(
            points.cancelServicePayment.mock.invocationCallOrder[0],
        ).toBeLessThan(contracts.cancelContract.mock.invocationCallOrder[0]);
        // A voided pending payment short-circuits the completed-settlement guard.
        expect(points.isServicePaymentCompleted).not.toHaveBeenCalled();
        expect(result).toBe(claimed);
        expect(emitter.emit).toHaveBeenCalledWith(
            "booking.cancelled",
            expect.objectContaining({ bookingId: "b1", actorId: "initiator" }),
        );
    });

    it("reverts to completed and rejects when the settlement won the cancel race", async () => {
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(
                pendingBooking({
                    status: BookingStatus.ACCEPTED,
                    contractId: "c1",
                }),
            ),
            findOneAndUpdate: jest.fn().mockResolvedValue(
                pendingBooking({
                    status: BookingStatus.CANCELLED,
                    contractId: "c1",
                }),
            ),
            updateOne: jest.fn().mockResolvedValue(undefined),
        };
        const contracts: any = {
            cancelContract: jest.fn(),
        };
        // Nothing was voided and the payment reads completed: settlement won.
        const points: any = {
            cancelServicePayment: jest.fn().mockResolvedValue(false),
            isServicePaymentCompleted: jest.fn().mockResolvedValue(true),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
            emitter as any,
        );
        const error = await rejectionOf(svc.cancel("b1", "owner"));
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
            "A fully-signed contract cannot be cancelled",
        );
        expect(bookingModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: "b1", status: { $in: [BookingStatus.ACCEPTED] } },
            { $set: { status: BookingStatus.CANCELLED } },
            { new: true },
        );
        expect(points.cancelServicePayment).toHaveBeenCalledWith("c1");
        expect(points.isServicePaymentCompleted).toHaveBeenCalledWith("c1");
        expect(bookingModel.updateOne).toHaveBeenCalledWith(
            { _id: "b1", status: BookingStatus.CANCELLED },
            { $set: { status: BookingStatus.COMPLETED } },
        );
        // The settlement already moved the money: the contract is never cancelled.
        expect(contracts.cancelContract).not.toHaveBeenCalled();
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("cancels the contract and voids a still-pending payment when cancel won the race", async () => {
        const claimed: any = pendingBooking({
            status: BookingStatus.CANCELLED,
            contractId: "c1",
            pointsAmount: 2,
        });
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(
                pendingBooking({
                    status: BookingStatus.ACCEPTED,
                    contractId: "c1",
                    pointsAmount: 2,
                }),
            ),
            findOneAndUpdate: jest.fn().mockResolvedValue(claimed),
            updateOne: jest.fn(),
        };
        const contracts: any = {
            cancelContract: jest.fn().mockResolvedValue(undefined),
        };
        // A pending payment still exists, so cancel voids it and wins the race.
        const points: any = {
            cancelServicePayment: jest.fn().mockResolvedValue(true),
            isServicePaymentCompleted: jest.fn(),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            contracts,
            points,
            emitter as any,
        );
        const result = await svc.cancel("b1", "initiator");
        expect(points.cancelServicePayment).toHaveBeenCalledWith("c1");
        expect(points.isServicePaymentCompleted).not.toHaveBeenCalled();
        expect(contracts.cancelContract).toHaveBeenCalledWith("c1");
        // The booking stays cancelled — no revert to completed.
        expect(bookingModel.updateOne).not.toHaveBeenCalled();
        expect(result).toBe(claimed);
        expect(result.status).toBe(BookingStatus.CANCELLED);
        expect(emitter.emit).toHaveBeenCalledWith(
            "booking.cancelled",
            expect.objectContaining({
                bookingId: "b1",
                actorId: "initiator",
                amount: 2,
            }),
        );
    });

    it.each([
        BookingStatus.DECLINED,
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
    ])("rejects cancelling a booking that is %s", async (status) => {
        const bookingModel: any = {
            findById: jest.fn().mockResolvedValue(pendingBooking({ status })),
            findOneAndUpdate: jest.fn().mockResolvedValue(null),
        };
        const emitter = makeEmitter();
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            emitter as any,
        );
        const error = await rejectionOf(svc.cancel("b1", "initiator"));
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe("Booking cannot be cancelled");
        expect(emitter.emit).not.toHaveBeenCalled();
    });
});

describe("BookingsService.onContractFullySigned", () => {
    it("completes only an accepted booking via a status-guarded update", async () => {
        const bookingModel: any = {
            findById: jest.fn(),
            updateOne: jest.fn().mockResolvedValue(undefined),
        };
        const svc = new BookingsService(
            bookingModel,
            makeService(paidService()) as any,
            {} as any,
            {} as any,
            makeEmitter() as any,
        );
        await svc.onContractFullySigned({
            contractId: "c1",
            bookingId: "b1",
        });
        expect(bookingModel.updateOne).toHaveBeenCalledWith(
            { _id: "b1", status: BookingStatus.ACCEPTED },
            { $set: { status: BookingStatus.COMPLETED } },
        );
        expect(bookingModel.findById).not.toHaveBeenCalled();
    });
});
