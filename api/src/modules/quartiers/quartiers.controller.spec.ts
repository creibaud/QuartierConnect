import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AddMemberDto } from "src/modules/quartiers/dto/add-member.dto";
import { CreateQuartierDto } from "src/modules/quartiers/dto/create-quartier.dto";
import { UpdateQuartierDto } from "src/modules/quartiers/dto/update-quartier.dto";
import { QuartiersController } from "src/modules/quartiers/quartiers.controller";
import { QuartiersService } from "src/modules/quartiers/quartiers.service";

const mockUser = {
    id: "user-uuid",
    email: "user@example.com",
    fullName: "Test User",
    role: "resident" as const,
    balance: "100",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockAdmin = {
    ...mockUser,
    id: "admin-uuid",
    role: "admin" as const,
};

const mockQuartier = {
    id: "quartier-uuid",
    name: "Test Quartier",
    description: "Test description",
    adminId: mockUser.id,
    geofence: {
        type: "Polygon",
        coordinates: [
            [
                [2.3522, 48.8566],
                [2.3522, 48.9566],
                [2.4522, 48.9566],
                [2.4522, 48.8566],
                [2.3522, 48.8566],
            ],
        ],
    },
    memberCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("QuartiersController", () => {
    let controller: QuartiersController;
    let service: jest.Mocked<QuartiersService>;

    beforeEach(async () => {
        const mockService: jest.Mocked<QuartiersService> = {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            addMember: jest.fn(),
            removeMember: jest.fn(),
            getMembers: jest.fn(),
            updatePermissions: jest.fn(),
            getAllStats: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [QuartiersController],
            providers: [
                {
                    provide: QuartiersService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<QuartiersController>(QuartiersController);
        service = module.get(QuartiersService);
    });

    describe("create", () => {
        it("should create a new quartier", async () => {
            const dto: CreateQuartierDto = {
                name: "New Quartier",
                description: "New description",
                geofence: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [2.3522, 48.8566],
                            [2.3522, 48.9566],
                            [2.4522, 48.9566],
                            [2.4522, 48.8566],
                            [2.3522, 48.8566],
                        ],
                    ],
                },
            };

            service.create.mockResolvedValue(mockQuartier);

            const result = await controller.create(mockUser, dto);

            expect(service.create).toHaveBeenCalledWith(mockUser.id, dto);
            expect(result).toEqual(mockQuartier);
        });

        it("should only allow admins to create quartiers", async () => {
            const dto: CreateQuartierDto = {
                name: "New Quartier",
                description: "New description",
                geofence: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [2.3522, 48.8566],
                            [2.3522, 48.9566],
                            [2.4522, 48.9566],
                            [2.4522, 48.8566],
                            [2.3522, 48.8566],
                        ],
                    ],
                },
            };

            service.create.mockRejectedValue(
                new ForbiddenException("Only admins can create quartiers"),
            );

            await expect(controller.create(mockUser, dto)).rejects.toThrow(
                ForbiddenException,
            );
        });
    });

    describe("findAll", () => {
        it("should return paginated list of quartiers", async () => {
            service.findAll.mockResolvedValue({
                data: [mockQuartier],
                meta: {
                    total: 5,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            });

            const result = await controller.findAll({ page: 1, limit: 10 });

            expect(service.findAll).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
            });
            expect(result.data).toHaveLength(1);
        });

        it("should support pagination", async () => {
            service.findAll.mockResolvedValue({
                data: [],
                meta: {
                    total: 50,
                    page: 2,
                    limit: 10,
                    pages: 5,
                    hasNextPage: true,
                    hasPrevPage: true,
                },
            });

            const result = await controller.findAll({ page: 2, limit: 10 });

            expect(result.meta.page).toBe(2);
            expect(result.meta.hasNextPage).toBe(true);
        });
    });

    describe("findOne", () => {
        it("should return a single quartier", async () => {
            service.findOne.mockResolvedValue(mockQuartier);

            const result = await controller.findOne("quartier-uuid");

            expect(service.findOne).toHaveBeenCalledWith("quartier-uuid");
            expect(result).toEqual(mockQuartier);
        });

        it("should throw NotFoundException if quartier not found", async () => {
            service.findOne.mockRejectedValue(
                new NotFoundException("Quartier not found"),
            );

            await expect(controller.findOne("non-existent")).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("update", () => {
        it("should update quartier successfully", async () => {
            const dto: UpdateQuartierDto = {
                name: "Updated Name",
            };

            const updatedQuartier = { ...mockQuartier, name: "Updated Name" };
            service.update.mockResolvedValue(updatedQuartier);

            const result = await controller.update("quartier-uuid", dto);

            expect(service.update).toHaveBeenCalledWith("quartier-uuid", dto);
            expect(result.name).toBe("Updated Name");
        });
    });

    describe("delete", () => {
        it("should delete quartier successfully", async () => {
            service.delete.mockResolvedValue(undefined);

            await expect(
                controller.delete("quartier-uuid"),
            ).resolves.not.toThrow();

            expect(service.delete).toHaveBeenCalledWith("quartier-uuid");
        });
    });

    describe("addMember", () => {
        it("should add a member to quartier", async () => {
            const dto: AddMemberDto = {
                userId: "new-user-uuid",
            };

            service.addMember.mockResolvedValue({
                userId: "new-user-uuid",
                quartierId: "quartier-uuid",
                joinedAt: new Date(),
            });

            const result = await controller.addMember("quartier-uuid", dto);

            expect(service.addMember).toHaveBeenCalledWith(
                "quartier-uuid",
                dto,
            );
            expect(result).toBeDefined();
        });
    });

    describe("removeMember", () => {
        it("should remove a member from quartier", async () => {
            service.removeMember.mockResolvedValue(undefined);

            await expect(
                controller.removeMember("quartier-uuid", "member-uuid"),
            ).resolves.not.toThrow();

            expect(service.removeMember).toHaveBeenCalledWith(
                "quartier-uuid",
                "member-uuid",
            );
        });
    });

    describe("getMembers", () => {
        it("should return paginated list of members", async () => {
            const mockMembers = [
                {
                    userId: "user-1",
                    quartierId: "quartier-uuid",
                    joinedAt: new Date(),
                },
                {
                    userId: "user-2",
                    quartierId: "quartier-uuid",
                    joinedAt: new Date(),
                },
            ];

            service.getMembers.mockResolvedValue({
                data: mockMembers,
                meta: {
                    total: 10,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            });

            const result = await controller.getMembers("quartier-uuid", {
                page: 1,
                limit: 10,
            });

            expect(service.getMembers).toHaveBeenCalledWith("quartier-uuid", {
                page: 1,
                limit: 10,
            });
            expect(result.data).toHaveLength(2);
        });
    });
});
