import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { IIncidentsRepository } from "src/modules/incidents/incident.repository";
import { IncidentsService } from "src/modules/incidents/incidents.service";

const INCIDENT_ID = "incident-uuid-1";
const CREATOR_ID = "user-uuid-1";
const OTHER_USER_ID = "user-uuid-2";
const ADMIN_ROLE = "admin";
const RESIDENT_ROLE = "resident";

const mockIncident = {
    id: INCIDENT_ID,
    creatorId: CREATOR_ID,
    title: "Test Incident",
    description: "Something broke",
    status: "open" as const,
    priority: "medium" as const,
    type: "other" as const,
    locationGeojson: null,
    attachmentUrls: [],
    resolvedAt: null,
    resolvedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockComment = {
    id: "comment-uuid-1",
    incidentId: INCIDENT_ID,
    authorId: CREATOR_ID,
    content: "This is a comment",
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockPaginatedResult = {
    data: [mockIncident],
    meta: {
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
        hasNextPage: false,
        hasPrevPage: false,
    },
};

describe("IncidentsService", () => {
    let service: IncidentsService;
    let repository: jest.Mocked<IIncidentsRepository>;

    beforeEach(() => {
        repository = {
            create: jest.fn().mockResolvedValue(mockIncident),
            findAll: jest.fn().mockResolvedValue(mockPaginatedResult),
            findOne: jest.fn().mockResolvedValue(mockIncident),
            update: jest.fn().mockResolvedValue(mockIncident),
            delete: jest.fn().mockResolvedValue(undefined),
            createComment: jest.fn().mockResolvedValue(mockComment),
            findComments: jest.fn().mockResolvedValue({
                data: [mockComment],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            }),
        };

        service = new IncidentsService(repository);
    });

    describe("create", () => {
        it("creates an incident with defaults", async () => {
            const result = await service.create(CREATOR_ID, {
                title: "Test Incident",
            });

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    creatorId: CREATOR_ID,
                    title: "Test Incident",
                    type: "other",
                    priority: "medium",
                }),
            );
            expect(result.id).toBe(INCIDENT_ID);
        });

        it("uses provided type and priority", async () => {
            await service.create(CREATOR_ID, {
                title: "Test",
                type: "noise",
                priority: "high",
            });

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({ type: "noise", priority: "high" }),
            );
        });
    });

    describe("findAll", () => {
        it("returns a paginated result", async () => {
            const result = await service.findAll({ page: 1, limit: 10 });

            expect(repository.findAll).toHaveBeenCalledWith(
                expect.any(Object),
                1,
                10,
            );
            expect(result.data).toBeDefined();
            expect(result.meta).toBeDefined();
        });

        it("passes filters to repository", async () => {
            await service.findAll({
                page: 1,
                limit: 10,
                status: "open",
                priority: "high",
                search: "test",
            });

            expect(repository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "open",
                    priority: "high",
                    search: "test",
                }),
                1,
                10,
            );
        });
    });

    describe("findOne", () => {
        it("returns an incident when found", async () => {
            const result = await service.findOne(INCIDENT_ID);
            expect(result.id).toBe(INCIDENT_ID);
        });

        it("throws NotFoundException when incident does not exist", async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.findOne("non-existent-id")).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("update", () => {
        it("allows admin to update any incident", async () => {
            repository.update.mockResolvedValue({
                ...mockIncident,
                priority: "high",
            });

            const result = await service.update(
                INCIDENT_ID,
                OTHER_USER_ID,
                ADMIN_ROLE,
                { priority: "high" },
            );

            expect(result?.priority).toBe("high");
        });

        it("allows creator to update their own open incident", async () => {
            repository.update.mockResolvedValue({
                ...mockIncident,
                description: "Updated",
            });

            const result = await service.update(
                INCIDENT_ID,
                CREATOR_ID,
                RESIDENT_ROLE,
                { description: "Updated" },
            );

            expect(result?.description).toBe("Updated");
        });

        it("throws ForbiddenException when non-creator non-admin tries to update", async () => {
            await expect(
                service.update(INCIDENT_ID, OTHER_USER_ID, RESIDENT_ROLE, {
                    priority: "high",
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it("throws ForbiddenException when creator tries to update a resolved incident", async () => {
            repository.findOne.mockResolvedValue({
                ...mockIncident,
                status: "resolved",
            });

            await expect(
                service.update(INCIDENT_ID, CREATOR_ID, RESIDENT_ROLE, {
                    description: "Try",
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it("sets resolvedAt and resolvedBy when status is resolved", async () => {
            const now = new Date();
            repository.update.mockResolvedValue({
                ...mockIncident,
                status: "resolved",
                resolvedAt: now,
                resolvedBy: CREATOR_ID,
            });

            await service.update(INCIDENT_ID, CREATOR_ID, ADMIN_ROLE, {
                status: "resolved",
            });

            expect(repository.update).toHaveBeenCalledWith(
                INCIDENT_ID,
                expect.objectContaining({
                    resolvedAt: expect.any(Date),
                    resolvedBy: CREATOR_ID,
                }),
            );
        });
    });

    describe("delete", () => {
        it("allows admin to delete an incident", async () => {
            await expect(
                service.delete(INCIDENT_ID, ADMIN_ROLE),
            ).resolves.not.toThrow();

            expect(repository.delete).toHaveBeenCalledWith(INCIDENT_ID);
        });

        it("throws ForbiddenException for non-admin delete", async () => {
            await expect(
                service.delete(INCIDENT_ID, RESIDENT_ROLE),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("addComment", () => {
        it("adds a comment to an incident successfully", async () => {
            const result = await service.addComment(INCIDENT_ID, CREATOR_ID, {
                content: "This is a comment",
            });

            expect(repository.createComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    incidentId: INCIDENT_ID,
                    authorId: CREATOR_ID,
                    content: "This is a comment",
                }),
            );
            expect(result.content).toBe("This is a comment");
        });

        it("throws NotFoundException when incident does not exist", async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.addComment("non-existent", CREATOR_ID, {
                    content: "comment",
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("getComments", () => {
        it("returns paginated comments for an incident", async () => {
            const result = await service.getComments(INCIDENT_ID, {
                page: 1,
                limit: 10,
            });

            expect(repository.findComments).toHaveBeenCalledWith(
                INCIDENT_ID,
                1,
                10,
            );
            expect(result.data).toBeDefined();
        });
    });
});
