import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AddCommentDto } from "src/modules/incidents/dto/add-comment.dto";
import { CreateIncidentDto } from "src/modules/incidents/dto/create-incident.dto";
import { UpdateIncidentDto } from "src/modules/incidents/dto/update-incident.dto";
import { IncidentsController } from "src/modules/incidents/incidents.controller";
import { IncidentsService } from "src/modules/incidents/incidents.service";

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

const mockModerator = {
    ...mockUser,
    id: "moderator-uuid",
    role: "moderator" as const,
};

const mockIncident = {
    id: "incident-uuid",
    creatorId: mockUser.id,
    title: "Broken Street Light",
    description: "Street light on Main St is broken",
    status: "open" as const,
    priority: "medium" as const,
    type: "infrastructure" as const,
    quartierId: "quartier-uuid",
    locationGeojson: { type: "Point" as const, coordinates: [2.3522, 48.8566] },
    attachmentUrls: [],
    resolvedAt: null,
    resolvedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("IncidentsController", () => {
    let controller: IncidentsController;
    let service: jest.Mocked<IncidentsService>;

    beforeEach(async () => {
        const mockService: jest.Mocked<IncidentsService> = {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            addComment: jest.fn(),
            getComments: jest.fn(),
            resolve: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [IncidentsController],
            providers: [
                {
                    provide: IncidentsService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<IncidentsController>(IncidentsController);
        service = module.get(IncidentsService) as jest.Mocked<IncidentsService>;
    });

    describe("create", () => {
        it("should create a new incident", async () => {
            const dto: CreateIncidentDto = {
                title: "Broken Street Light",
                description: "Street light is broken",
                type: "infrastructure",
                priority: "medium",
                quartierId: "quartier-uuid",
            };

            service.create.mockResolvedValue(mockIncident);

            const result = await controller.create(mockUser, dto);

            expect(service.create).toHaveBeenCalledWith(mockUser.id, dto);
            expect(result).toEqual(mockIncident);
        });

        it("should accept incidents with location", async () => {
            const dto: CreateIncidentDto = {
                title: "Pothole",
                description: "Large pothole in road",
                type: "infrastructure",
                priority: "high",
                quartierId: "quartier-uuid",
                locationGeojson: {
                    type: "Point",
                    coordinates: [2.3522, 48.8566],
                },
            };

            service.create.mockResolvedValue(mockIncident);

            const result = await controller.create(mockUser, dto);

            expect(service.create).toHaveBeenCalledWith(mockUser.id, dto);
            expect(result).toBeDefined();
        });
    });

    describe("findAll", () => {
        it("should return paginated list of incidents", async () => {
            service.findAll.mockResolvedValue({
                data: [mockIncident],
                meta: {
                    total: 25,
                    page: 1,
                    limit: 10,
                    pages: 3,
                    hasNextPage: true,
                    hasPrevPage: false,
                },
            });

            const result = await controller.findAll(
                { page: 1, limit: 10 },
                mockUser,
            );

            expect(service.findAll).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
            });
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(25);
        });

        it("should filter open incidents", async () => {
            service.findAll.mockResolvedValue({
                data: [mockIncident],
                meta: {
                    total: 10,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            });

            const result = await controller.findAll(
                { page: 1, limit: 10, status: "open" },
                mockUser,
            );

            expect(service.findAll).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                status: "open",
            });
            expect(result.data[0].status).toBe("open");
        });

        it("should filter by priority", async () => {
            service.findAll.mockResolvedValue({
                data: [mockIncident],
                meta: {
                    total: 5,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            });

            await controller.findAll(
                { page: 1, limit: 10, priority: "high" },
                mockUser,
            );

            expect(service.findAll).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                priority: "high",
            });
        });
    });

    describe("findOne", () => {
        it("should return a single incident", async () => {
            service.findOne.mockResolvedValue(mockIncident);

            const result = await controller.findOne("incident-uuid", mockUser);

            expect(service.findOne).toHaveBeenCalledWith("incident-uuid");
            expect(result).toEqual(mockIncident);
        });

        it("should throw NotFoundException if not found", async () => {
            service.findOne.mockRejectedValue(
                new NotFoundException("Incident not found"),
            );

            await expect(
                controller.findOne("non-existent", mockUser),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("update", () => {
        it("should update incident successfully", async () => {
            const dto: UpdateIncidentDto = {
                priority: "high",
            };

            const updated = { ...mockIncident, priority: "high" as const };
            service.update.mockResolvedValue(updated);

            const result = await controller.update(
                "incident-uuid",
                mockUser,
                dto,
            );

            expect(service.update).toHaveBeenCalledWith(
                "incident-uuid",
                mockUser.id,
                "resident",
                dto,
            );
            expect(result.priority).toBe("high");
        });

        it("should allow creator to update", async () => {
            const dto: UpdateIncidentDto = {
                description: "Updated description",
            };

            service.update.mockResolvedValue(mockIncident);

            await controller.update("incident-uuid", mockUser, dto);

            expect(service.update).toHaveBeenCalledWith(
                "incident-uuid",
                mockUser.id,
                "resident",
                dto,
            );
        });

        it("should allow admin to update any incident", async () => {
            const dto: UpdateIncidentDto = { status: "resolved" };

            service.update.mockResolvedValue(mockIncident);

            await controller.update("incident-uuid", mockAdmin, dto);

            expect(service.update).toHaveBeenCalledWith(
                "incident-uuid",
                mockAdmin.id,
                "admin",
                dto,
            );
        });

        it("should throw ForbiddenException if not authorized", async () => {
            const dto: UpdateIncidentDto = { priority: "critical" };

            service.update.mockRejectedValue(
                new ForbiddenException("Not authorized to update"),
            );

            await expect(
                controller.update("incident-uuid", mockUser, dto),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("delete", () => {
        it("should delete incident", async () => {
            service.delete.mockResolvedValue(undefined);

            await expect(
                controller.delete("incident-uuid", mockAdmin),
            ).resolves.not.toThrow();

            expect(service.delete).toHaveBeenCalledWith(
                "incident-uuid",
                "admin",
            );
        });

        it("should throw ForbiddenException for non-admin", async () => {
            service.delete.mockRejectedValue(
                new ForbiddenException("Only admins can delete incidents"),
            );

            await expect(
                controller.delete("incident-uuid", mockUser),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("addComment", () => {
        it("should add comment to incident", async () => {
            const dto: AddCommentDto = {
                content: "I can help fix this",
            };

            const mockComment = {
                id: "comment-uuid",
                incidentId: "incident-uuid",
                authorId: mockUser.id,
                content: "I can help fix this",
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            service.addComment.mockResolvedValue(mockComment);

            const result = await controller.addComment(
                "incident-uuid",
                mockUser,
                dto,
            );

            expect(service.addComment).toHaveBeenCalledWith(
                "incident-uuid",
                mockUser.id,
                dto,
            );
            expect(result.content).toBe("I can help fix this");
        });

        it("should throw NotFoundException if incident not found", async () => {
            const dto: AddCommentDto = { content: "Comment" };

            service.addComment.mockRejectedValue(
                new NotFoundException("Incident not found"),
            );

            await expect(
                controller.addComment("non-existent", mockUser, dto),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("getComments", () => {
        it("should return paginated comments for incident", async () => {
            const mockComments = [
                {
                    id: "comment-1",
                    incidentId: "incident-uuid",
                    authorId: "user-1",
                    content: "First comment",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            service.getComments.mockResolvedValue({
                data: mockComments,
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            });

            const result = await controller.getComments("incident-uuid", {
                page: 1,
                limit: 10,
            });

            expect(service.getComments).toHaveBeenCalledWith("incident-uuid", {
                page: 1,
                limit: 10,
            });
            expect(result.data).toHaveLength(1);
        });
    });
});
