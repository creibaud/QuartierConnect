import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
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

const buildDrizzleMock = () => {
    const chainable = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockIncident]),
    };
    return chainable;
};

describe("IncidentsService", () => {
    let service: IncidentsService;
    let drizzleMock: ReturnType<typeof buildDrizzleMock>;

    beforeEach(async () => {
        drizzleMock = buildDrizzleMock();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IncidentsService,
                { provide: "DRIZZLE", useValue: drizzleMock },
            ],
        }).compile();

        service = module.get<IncidentsService>(IncidentsService);
    });

    describe("create", () => {
        it("creates an incident successfully", async () => {
            const result = await service.create(CREATOR_ID, {
                title: "Test Incident",
                priority: "medium",
            });

            expect(result).toBeDefined();
            expect(result.id).toBe(INCIDENT_ID);
        });
    });

    describe("findAll", () => {
        it("returns a paginated result", async () => {
            const listChain = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                offset: jest.fn().mockResolvedValue([mockIncident]),
            };
            const countChain = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ count: 1 }]),
            };
            drizzleMock.select
                .mockReturnValueOnce(listChain)
                .mockReturnValueOnce(countChain);

            const result = await service.findAll({ page: 1, limit: 10 });

            expect(result.data).toBeDefined();
            expect(result.meta).toBeDefined();
        });
    });

    describe("findOne", () => {
        it("returns an incident when found", async () => {
            drizzleMock.limit.mockResolvedValue([mockIncident]);

            const result = await service.findOne(INCIDENT_ID);

            expect(result.id).toBe(INCIDENT_ID);
        });

        it("throws NotFoundException when incident does not exist", async () => {
            drizzleMock.limit.mockResolvedValue([]);

            await expect(service.findOne("non-existent-id")).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("update", () => {
        it("allows admin to update any incident", async () => {
            drizzleMock.limit.mockResolvedValue([mockIncident]);
            drizzleMock.returning.mockResolvedValue([
                { ...mockIncident, priority: "high" },
            ]);

            const result = await service.update(
                INCIDENT_ID,
                OTHER_USER_ID,
                ADMIN_ROLE,
                { priority: "high" },
            );

            expect(result.priority).toBe("high");
        });

        it("allows creator to update their own open incident", async () => {
            drizzleMock.limit.mockResolvedValue([mockIncident]);
            drizzleMock.returning.mockResolvedValue([
                { ...mockIncident, description: "Updated" },
            ]);

            const result = await service.update(
                INCIDENT_ID,
                CREATOR_ID,
                RESIDENT_ROLE,
                { description: "Updated" },
            );

            expect(result.description).toBe("Updated");
        });

        it("throws ForbiddenException when non-creator non-admin tries to update", async () => {
            drizzleMock.limit.mockResolvedValue([mockIncident]);

            await expect(
                service.update(INCIDENT_ID, OTHER_USER_ID, RESIDENT_ROLE, {
                    priority: "high",
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it("throws ForbiddenException when creator tries to update a resolved incident", async () => {
            drizzleMock.limit.mockResolvedValue([
                { ...mockIncident, status: "resolved" },
            ]);

            await expect(
                service.update(INCIDENT_ID, CREATOR_ID, RESIDENT_ROLE, {
                    description: "Try",
                }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("delete", () => {
        it("allows admin to delete an incident", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockIncident);
            drizzleMock.where.mockReturnThis();

            await expect(
                service.delete(INCIDENT_ID, ADMIN_ROLE),
            ).resolves.not.toThrow();
        });

        it("throws ForbiddenException for non-admin delete", async () => {
            await expect(
                service.delete(INCIDENT_ID, RESIDENT_ROLE),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe("addComment", () => {
        it("adds a comment to an incident successfully", async () => {
            drizzleMock.limit.mockResolvedValue([mockIncident]);
            drizzleMock.returning.mockResolvedValue([mockComment]);

            const result = await service.addComment(INCIDENT_ID, CREATOR_ID, {
                content: "This is a comment",
            });

            expect(result.content).toBe("This is a comment");
        });
    });
});
