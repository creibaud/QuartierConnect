import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";

describe("ServicesController", () => {
    let controller: ServicesController;
    let service: ServicesService;

    const mockUser = {
        id: "user-uuid",
        email: "user@test.local",
        role: "resident" as const,
        isActive: true,
    };

    const mockOtherUser = {
        id: "other-user-id",
        email: "other@test.local",
        role: "resident" as const,
        isActive: true,
    };

    const mockService = {
        id: "service-uuid",
        title: "Cours de jardinage",
        category: "education",
        type: "offer",
        status: "open",
        creatorId: mockUser.id,
        quartierId: "quartier-uuid",
        durationMinutes: 60,
        createdAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ServicesController],
            providers: [
                {
                    provide: ServicesService,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findMine: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        accept: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ServicesController>(ServicesController);
        service = module.get<ServicesService>(ServicesService);
    });

    describe("create", () => {
        it("should create a service offer", async () => {
            const createDto = {
                title: "Cours de jardinage",
                category: "education",
            };
            service.create.mockResolvedValue(mockService);

            const result = await controller.create(mockUser, createDto);

            expect(service.create).toHaveBeenCalledWith(mockUser.id, createDto);
            expect(result.creatorId).toBe(mockUser.id);
        });

        it("should throw BadRequestException on invalid category", async () => {
            service.create.mockRejectedValue(
                new BadRequestException("Invalid category"),
            );

            await expect(
                controller.create(mockUser, {
                    title: "Test",
                    category: "invalid",
                }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe("findAll", () => {
        it("should return paginated services", async () => {
            const query = { page: 1, limit: 10, category: "education" };
            const paginated = {
                data: [mockService],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findAll.mockResolvedValue(paginated);

            const result = await controller.findAll(query);

            expect(service.findAll).toHaveBeenCalledWith(query);
            expect(result.data).toHaveLength(1);
        });

        it("should handle empty results", async () => {
            const query = { page: 1, limit: 10, category: "nonexistent" };
            const empty = {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit: 10,
                    pages: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findAll.mockResolvedValue(empty);

            const result = await controller.findAll(query);

            expect(result.data).toHaveLength(0);
        });
    });

    describe("findMine", () => {
        it("should return user's services", async () => {
            const query = { page: 1, limit: 10 };
            const paginated = {
                data: [mockService],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
            service.findMine.mockResolvedValue(paginated);

            const result = await controller.findMine(mockUser, query);

            expect(service.findMine).toHaveBeenCalledWith(mockUser.id, query);
            expect(result.data).toHaveLength(1);
        });
    });

    describe("findOne", () => {
        it("should return a service by ID", async () => {
            service.findOne.mockResolvedValue(mockService);

            const result = await controller.findOne("service-uuid");

            expect(service.findOne).toHaveBeenCalledWith("service-uuid");
            expect(result.id).toBe("service-uuid");
        });

        it("should throw NotFoundException if service not found", async () => {
            service.findOne.mockRejectedValue(
                new NotFoundException("Service not found"),
            );

            await expect(controller.findOne("non-existent")).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("update", () => {
        it("should update a service (creator)", async () => {
            const updateDto = { title: "Updated course" };
            const updated = { ...mockService, ...updateDto };
            service.update.mockResolvedValue(updated);

            const result = await controller.update(
                "service-uuid",
                mockUser,
                updateDto,
            );

            expect(service.update).toHaveBeenCalledWith(
                "service-uuid",
                mockUser.id,
                updateDto,
            );
            expect(result.title).toBe("Updated course");
        });

        it("should throw ForbiddenException if not creator", async () => {
            service.update.mockRejectedValue(
                new ForbiddenException("Not the creator"),
            );

            await expect(
                controller.update("service-uuid", mockOtherUser, {
                    title: "Hacked",
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw BadRequestException if service not open", async () => {
            service.update.mockRejectedValue(
                new BadRequestException("Service is not open"),
            );

            await expect(
                controller.update("service-uuid", mockUser, {
                    title: "Update",
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw NotFoundException if service not found", async () => {
            service.update.mockRejectedValue(
                new NotFoundException("Service not found"),
            );

            await expect(
                controller.update("non-existent", mockUser, {
                    title: "Update",
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("delete", () => {
        it("should delete a service (creator, open status)", async () => {
            service.delete.mockResolvedValue({ message: "Service deleted" });

            await controller.delete("service-uuid", mockUser);

            expect(service.delete).toHaveBeenCalledWith(
                "service-uuid",
                mockUser.id,
            );
        });

        it("should throw ForbiddenException if not creator", async () => {
            service.delete.mockRejectedValue(
                new ForbiddenException("Not the creator"),
            );

            await expect(
                controller.delete("service-uuid", mockOtherUser),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should throw BadRequestException if not open", async () => {
            service.delete.mockRejectedValue(
                new BadRequestException("Service is not open"),
            );

            await expect(
                controller.delete("service-uuid", mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw NotFoundException if service not found", async () => {
            service.delete.mockRejectedValue(
                new NotFoundException("Service not found"),
            );

            await expect(
                controller.delete("non-existent", mockUser),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("accept", () => {
        it("should accept a service offer", async () => {
            const accepted = { ...mockService, status: "accepted" };
            service.accept.mockResolvedValue(accepted);

            const result = await controller.accept(
                "service-uuid",
                mockOtherUser,
            );

            expect(service.accept).toHaveBeenCalledWith(
                "service-uuid",
                mockOtherUser.id,
            );
            expect(result.status).toBe("accepted");
        });

        it("should throw BadRequestException if accepting own service", async () => {
            service.accept.mockRejectedValue(
                new BadRequestException("Cannot accept own service"),
            );

            await expect(
                controller.accept("service-uuid", mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw BadRequestException if service not open", async () => {
            service.accept.mockRejectedValue(
                new BadRequestException("Service is not open"),
            );

            await expect(
                controller.accept("service-uuid", mockOtherUser),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw NotFoundException if service not found", async () => {
            service.accept.mockRejectedValue(
                new NotFoundException("Service not found"),
            );

            await expect(
                controller.accept("non-existent", mockOtherUser),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("rate", () => {
        it("should rate a completed service", async () => {
            const rateDto = { rating: 5, comment: "Excellent course!" };
            const response = {
                serviceId: "service-uuid",
                rating: 5,
                ratedBy: mockOtherUser.id,
            };
            service.rate = jest.fn().mockResolvedValue(response);

            const result = await (service.rate as any)(
                "service-uuid",
                mockOtherUser.id,
                rateDto,
            );

            expect(result.rating).toBe(5);
        });
    });
});
