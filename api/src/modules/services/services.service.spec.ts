import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import type { OutboxService } from "src/modules/outbox/outbox.service";
import type { IServicesRepository } from "src/modules/services/service.repository";
import { ServicesService } from "./services.service";

const SERVICE_ID = new ObjectId().toHexString();

const baseService = {
    id: SERVICE_ID,
    quartierId: "quartier-uuid",
    creatorId: "creator-uuid",
    title: "Garden help",
    category: "gardening" as const,
    type: "paid" as const,
    estimatedDurationMinutes: 60,
    pointsValue: 2,
    status: "open" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const acceptedService = {
    ...baseService,
    status: "accepted" as const,
    acceptorId: "acceptor-uuid",
};

const completedService = {
    ...acceptedService,
    status: "completed" as const,
    completedAt: new Date(),
};

describe("ServicesService", () => {
    let service: ServicesService;
    let repository: jest.Mocked<IServicesRepository>;
    let outbox: { publish: jest.Mock };

    beforeEach(() => {
        jest.clearAllMocks();

        repository = {
            insertService: jest
                .fn()
                .mockResolvedValue(new ObjectId(SERVICE_ID)),
            findServices: jest.fn().mockResolvedValue([]),
            countServices: jest.fn().mockResolvedValue(0),
            findServiceById: jest.fn().mockResolvedValue(null),
            updateService: jest.fn().mockResolvedValue(undefined),
            deleteService: jest.fn().mockResolvedValue(undefined),
            findRating: jest.fn().mockResolvedValue(null),
            insertRating: jest.fn().mockResolvedValue(undefined),
            insertTransaction: jest.fn().mockResolvedValue(undefined),
            getPointConfigForCategory: jest.fn().mockResolvedValue({
                basePointsPerHour: 2,
                multiplier: 1,
            }),
            getUserBalance: jest.fn().mockResolvedValue(10),
            deductUserBalance: jest.fn().mockResolvedValue(undefined),
            addUserBalance: jest.fn().mockResolvedValue(undefined),
        };

        outbox = { publish: jest.fn().mockResolvedValue(undefined) };

        service = new ServicesService(
            repository,
            outbox as unknown as OutboxService,
        );
    });

    describe("create — point calculation", () => {
        it("calculates 1 point minimum for duration < 30 minutes", async () => {
            repository.getPointConfigForCategory.mockResolvedValue({
                basePointsPerHour: 2,
                multiplier: 1,
            });

            await service.create("creator-uuid", {
                quartierId: "quartier-uuid",
                title: "Quick help",
                category: "cleaning",
                type: "free",
                estimatedDurationMinutes: 20,
            });

            expect(repository.insertService).toHaveBeenCalledWith(
                expect.objectContaining({ pointsValue: 1 }),
            );
        });

        it("calculates 2 points for 60 minutes with basePointsPerHour=2, multiplier=1", async () => {
            await service.create("creator-uuid", {
                quartierId: "quartier-uuid",
                title: "Long task",
                category: "repair",
                type: "paid",
                estimatedDurationMinutes: 60,
            });

            expect(repository.insertService).toHaveBeenCalledWith(
                expect.objectContaining({ pointsValue: 2 }),
            );
        });

        it("applies category multiplier — 60min with multiplier=1.5 → 3 points", async () => {
            repository.getPointConfigForCategory.mockResolvedValue({
                basePointsPerHour: 2,
                multiplier: 1.5,
            });

            await service.create("creator-uuid", {
                quartierId: "quartier-uuid",
                title: "Babysitting",
                category: "babysitting",
                type: "paid",
                estimatedDurationMinutes: 60,
            });

            expect(repository.insertService).toHaveBeenCalledWith(
                expect.objectContaining({ pointsValue: 3 }),
            );
        });

        it("calculates 6 points for 90 minutes with multiplier=1.5", async () => {
            repository.getPointConfigForCategory.mockResolvedValue({
                basePointsPerHour: 2,
                multiplier: 1.5,
            });

            await service.create("creator-uuid", {
                quartierId: "quartier-uuid",
                title: "Babysitting long",
                category: "babysitting",
                type: "paid",
                estimatedDurationMinutes: 90,
            });

            expect(repository.insertService).toHaveBeenCalledWith(
                expect.objectContaining({ pointsValue: 6 }),
            );
        });

        it("publishes outbox event on service creation", async () => {
            await service.create("creator-uuid", {
                quartierId: "q-uuid",
                title: "Some service",
                category: "cooking",
                type: "free",
                estimatedDurationMinutes: 45,
            });

            expect(outbox.publish).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: OUTBOX_EVENT_TYPES.serviceCreated,
                    payload: expect.objectContaining({
                        creatorId: "creator-uuid",
                    }),
                }),
            );
        });
    });

    describe("accept", () => {
        beforeEach(() => {
            repository.findServiceById.mockResolvedValue({
                ...baseService,
                _id: new ObjectId(SERVICE_ID),
            });
        });

        it("successfully accepts an open service", async () => {
            const result = await service.accept(SERVICE_ID, "acceptor-uuid");

            expect(repository.updateService).toHaveBeenCalledWith(
                SERVICE_ID,
                expect.objectContaining({
                    status: "accepted",
                    acceptorId: "acceptor-uuid",
                }),
            );
            expect(result.status).toBe("accepted");
            expect(result.acceptorId).toBe("acceptor-uuid");
        });

        it("throws BadRequestException when creator tries to accept own service", async () => {
            await expect(
                service.accept(SERVICE_ID, "creator-uuid"),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("throws BadRequestException when service is not open", async () => {
            repository.findServiceById.mockResolvedValue({
                ...baseService,
                status: "accepted",
                _id: new ObjectId(SERVICE_ID),
            });

            await expect(
                service.accept(SERVICE_ID, "acceptor-uuid"),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe("complete (paid)", () => {
        beforeEach(() => {
            repository.findServiceById.mockResolvedValue({
                ...acceptedService,
                _id: new ObjectId(SERVICE_ID),
            });
        });

        it("transfers points when service type is paid", async () => {
            repository.getUserBalance.mockResolvedValue(10);

            const result = await service.complete(SERVICE_ID, "creator-uuid");

            expect(repository.insertTransaction).toHaveBeenCalled();
            expect(repository.deductUserBalance).toHaveBeenCalledWith(
                "creator-uuid",
                acceptedService.pointsValue,
                expect.any(Date),
            );
            expect(repository.addUserBalance).toHaveBeenCalledWith(
                "acceptor-uuid",
                acceptedService.pointsValue,
                expect.any(Date),
            );
            expect(result.status).toBe("completed");
        });

        it("throws BadRequestException when balance would fall below -10", async () => {
            repository.getUserBalance.mockResolvedValue(-9);

            await expect(
                service.complete(SERVICE_ID, "creator-uuid"),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("throws NotFoundException when creator account not found", async () => {
            repository.getUserBalance.mockResolvedValue(null);

            await expect(
                service.complete(SERVICE_ID, "creator-uuid"),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it("publishes outbox completed event", async () => {
            repository.getUserBalance.mockResolvedValue(20);

            await service.complete(SERVICE_ID, "creator-uuid");

            expect(outbox.publish).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: OUTBOX_EVENT_TYPES.serviceCompleted,
                }),
            );
        });

        it("skips payment for free service", async () => {
            repository.findServiceById.mockResolvedValue({
                ...acceptedService,
                type: "free",
                _id: new ObjectId(SERVICE_ID),
            });

            await service.complete(SERVICE_ID, "creator-uuid");

            expect(repository.insertTransaction).not.toHaveBeenCalled();
            expect(repository.deductUserBalance).not.toHaveBeenCalled();
        });
    });

    describe("cancel", () => {
        it("allows creator to cancel an open service", async () => {
            repository.findServiceById.mockResolvedValue({
                ...baseService,
                _id: new ObjectId(SERVICE_ID),
            });

            const result = await service.cancel(SERVICE_ID, "creator-uuid");

            expect(repository.updateService).toHaveBeenCalledWith(
                SERVICE_ID,
                expect.objectContaining({ status: "cancelled" }),
            );
            expect(result.status).toBe("cancelled");
        });

        it("throws ForbiddenException when unrelated user tries to cancel", async () => {
            repository.findServiceById.mockResolvedValue({
                ...baseService,
                _id: new ObjectId(SERVICE_ID),
            });

            await expect(
                service.cancel(SERVICE_ID, "random-user"),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });
    });

    describe("rate", () => {
        beforeEach(() => {
            repository.findServiceById.mockResolvedValue({
                ...completedService,
                _id: new ObjectId(SERVICE_ID),
            });
        });

        it("successfully rates a completed service", async () => {
            const result = await service.rate(SERVICE_ID, "creator-uuid", {
                rating: 5,
                comment: "Great service!",
            });

            expect(repository.insertRating).toHaveBeenCalled();
            expect(result.rating).toBe(5);
        });

        it("throws ConflictException when user has already rated", async () => {
            repository.findRating.mockResolvedValue({
                serviceId: SERVICE_ID,
                raterUserId: "creator-uuid",
                rating: 4,
                createdAt: new Date(),
            });

            await expect(
                service.rate(SERVICE_ID, "creator-uuid", { rating: 3 }),
            ).rejects.toBeInstanceOf(ConflictException);
        });

        it("throws BadRequestException when service is not completed", async () => {
            repository.findServiceById.mockResolvedValue({
                ...baseService,
                _id: new ObjectId(SERVICE_ID),
            });

            await expect(
                service.rate(SERVICE_ID, "creator-uuid", { rating: 4 }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("throws ForbiddenException when rater is not creator or acceptor", async () => {
            await expect(
                service.rate(SERVICE_ID, "random-user", { rating: 3 }),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });
    });
});
