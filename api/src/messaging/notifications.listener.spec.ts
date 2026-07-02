import { MessagingGateway } from "./messaging.gateway";
import { NotificationsListener } from "./notifications.listener";

describe("NotificationsListener", () => {
    let gateway: { sendNotification: jest.Mock };
    let listener: NotificationsListener;

    beforeEach(() => {
        gateway = { sendNotification: jest.fn() };
        listener = new NotificationsListener(
            gateway as unknown as MessagingGateway,
        );
    });

    describe("booking notifications", () => {
        const baseEvent = {
            bookingId: "b1",
            ownerId: "owner",
            initiatorId: "initiator",
            serviceTitle: "Gardening",
            amount: 3,
        };

        it("targets the service owner on booking.created", () => {
            listener.onBookingCreated({
                ...baseEvent,
                actorId: "initiator",
                actorName: "Alice",
            });

            expect(gateway.sendNotification).toHaveBeenCalledWith(
                ["owner"],
                "booking.created",
                {
                    bookingId: "b1",
                    serviceTitle: "Gardening",
                    amount: 3,
                    actorName: "Alice",
                },
            );
        });

        it("targets the initiator on booking.accepted by the owner", () => {
            listener.onBookingAccepted({ ...baseEvent, actorId: "owner" });

            expect(gateway.sendNotification).toHaveBeenCalledWith(
                ["initiator"],
                "booking.accepted",
                expect.objectContaining({ bookingId: "b1" }),
            );
        });

        it("targets the initiator on booking.declined by the owner", () => {
            listener.onBookingDeclined({ ...baseEvent, actorId: "owner" });

            expect(gateway.sendNotification).toHaveBeenCalledWith(
                ["initiator"],
                "booking.declined",
                expect.objectContaining({ bookingId: "b1" }),
            );
        });

        it("targets the owner on booking.cancelled by the initiator", () => {
            listener.onBookingCancelled({ ...baseEvent, actorId: "initiator" });

            expect(gateway.sendNotification).toHaveBeenCalledWith(
                ["owner"],
                "booking.cancelled",
                expect.objectContaining({ bookingId: "b1" }),
            );
        });

        it("targets the initiator on booking.cancelled by the owner", () => {
            listener.onBookingCancelled({ ...baseEvent, actorId: "owner" });

            expect(gateway.sendNotification).toHaveBeenCalledWith(
                ["initiator"],
                "booking.cancelled",
                expect.objectContaining({ bookingId: "b1" }),
            );
        });
    });

    describe("contract notifications", () => {
        it("targets the other signatories on contract.signed", () => {
            listener.onContractSigned({
                contractId: "c1",
                signerId: "user-1",
                signatories: ["user-1", "user-2"],
                bookingId: "b1",
                serviceTitle: "Contrat de service — Gardening",
                amount: 3,
                actorName: "Alice",
            });

            expect(gateway.sendNotification).toHaveBeenCalledWith(
                ["user-2"],
                "contract.signed",
                {
                    contractId: "c1",
                    bookingId: "b1",
                    serviceTitle: "Contrat de service — Gardening",
                    amount: 3,
                    actorName: "Alice",
                },
            );
        });

        it("targets every signatory on contract.fully_signed", () => {
            listener.onContractFullySigned({
                contractId: "c1",
                bookingId: "b1",
                signatories: ["user-1", "user-2"],
                serviceTitle: "Contrat de service — Gardening",
                amount: 3,
            });

            expect(gateway.sendNotification).toHaveBeenCalledWith(
                ["user-1", "user-2"],
                "contract.fully_signed",
                {
                    contractId: "c1",
                    bookingId: "b1",
                    serviceTitle: "Contrat de service — Gardening",
                    amount: 3,
                },
            );
        });

        it("targets nobody when contract.fully_signed carries no signatories", () => {
            listener.onContractFullySigned({
                contractId: "c1",
                bookingId: "b1",
            });

            expect(gateway.sendNotification).toHaveBeenCalledWith(
                [],
                "contract.fully_signed",
                expect.objectContaining({ contractId: "c1" }),
            );
        });
    });

    describe("points notifications", () => {
        it("targets both parties on points.settled", () => {
            listener.onPointsSettled({
                contractId: "c1",
                payerId: "payer",
                payeeId: "payee",
                amount: 30,
            });

            expect(gateway.sendNotification).toHaveBeenCalledWith(
                ["payer", "payee"],
                "points.settled",
                { contractId: "c1", amount: 30 },
            );
        });
    });
});
