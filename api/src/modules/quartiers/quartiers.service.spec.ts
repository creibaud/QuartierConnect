import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { GeoJsonPolygon } from "src/database/mongodb/models";
import { OutboxService } from "src/modules/outbox/outbox.service";
import { QuartiersService } from "src/modules/quartiers/quartiers.service";

const QUARTIER_ID = "quartier-uuid-1";
const USER_ID = "user-uuid-1";
const MONGO_GEO_ID = "507f1f77bcf86cd799439011";

const mockGeoJson: GeoJsonPolygon = {
    type: "Polygon" as const,
    coordinates: [
        [
            [2.3, 48.8],
            [2.4, 48.8],
            [2.4, 48.9],
            [2.3, 48.9],
            [2.3, 48.8],
        ],
    ],
};

const mockQuartier = {
    id: QUARTIER_ID,
    name: "Test Quartier",
    description: "A test quartier",
    mongoGeoId: MONGO_GEO_ID,
    adminUserId: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockMember = {
    id: USER_ID,
    email: "user@test.local",
    firstName: "Test",
    lastName: "User",
    role: "resident",
    isActive: true,
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
        orderBy: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockQuartier]),
    };
    return chainable;
};

const buildMongoMock = () => ({
    collection: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({
            insertedId: { toHexString: () => MONGO_GEO_ID },
        }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    }),
});

const buildOutboxMock = () => ({
    publish: jest.fn().mockResolvedValue(undefined),
});

describe("QuartiersService", () => {
    let service: QuartiersService;
    let drizzleMock: ReturnType<typeof buildDrizzleMock>;
    let mongoMock: ReturnType<typeof buildMongoMock>;
    let outboxMock: ReturnType<typeof buildOutboxMock>;

    beforeEach(async () => {
        drizzleMock = buildDrizzleMock();
        mongoMock = buildMongoMock();
        outboxMock = buildOutboxMock();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QuartiersService,
                { provide: "DRIZZLE", useValue: drizzleMock },
                { provide: "MONGODB", useValue: mongoMock },
                { provide: OutboxService, useValue: outboxMock },
            ],
        }).compile();

        service = module.get<QuartiersService>(QuartiersService);
    });

    describe("create", () => {
        it("creates a quartier successfully", async () => {
            jest.spyOn(
                service as never,
                "assertNoGeoIntersection",
            ).mockResolvedValue(void 0 as never);

            const result = await service.create(USER_ID, {
                name: "Test Quartier",
                geojson: mockGeoJson,
            });

            expect(result).toBeDefined();
            expect(mongoMock.collection).toHaveBeenCalled();
        });

        it("throws ConflictException when GeoJSON overlaps an existing quartier", async () => {
            mongoMock.collection.mockReturnValue({
                findOne: jest
                    .fn()
                    .mockResolvedValue({ quartierId: "other-id" }),
                insertOne: jest.fn(),
                updateOne: jest.fn(),
                deleteOne: jest.fn(),
            });

            await expect(
                service.create(USER_ID, { name: "Test", geojson: mockGeoJson }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe("findOne", () => {
        it("returns a quartier with GeoJSON when found", async () => {
            drizzleMock.limit.mockResolvedValue([mockQuartier]);
            mongoMock.collection.mockReturnValue({
                findOne: jest.fn().mockResolvedValue({ geojson: mockGeoJson }),
                insertOne: jest.fn(),
                updateOne: jest.fn(),
                deleteOne: jest.fn(),
            });

            const result = await service.findOne(QUARTIER_ID);

            expect(result.id).toBe(QUARTIER_ID);
            expect(result.geojson).toEqual(mockGeoJson);
        });

        it("throws NotFoundException when quartier does not exist", async () => {
            drizzleMock.limit.mockResolvedValue([]);

            await expect(service.findOne("non-existent-id")).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("addMember", () => {
        it("adds a member successfully", async () => {
            drizzleMock.limit.mockResolvedValue([mockMember]);
            drizzleMock.returning.mockResolvedValue([]);

            jest.spyOn(service, "findOne").mockResolvedValue({
                ...mockQuartier,
                geojson: mockGeoJson,
            });
            drizzleMock.values.mockReturnValue({
                ...drizzleMock,
                returning: jest.fn().mockResolvedValue([]),
            });

            await expect(
                service.addMember(QUARTIER_ID, { userId: USER_ID }),
            ).resolves.not.toThrow();
        });

        it("throws ConflictException when user is already assigned", async () => {
            drizzleMock.limit.mockResolvedValue([mockMember]);
            jest.spyOn(service, "findOne").mockResolvedValue({
                ...mockQuartier,
                geojson: mockGeoJson,
            });
            drizzleMock.values.mockRejectedValue(
                new Error("unique constraint"),
            );

            await expect(
                service.addMember(QUARTIER_ID, { userId: USER_ID }),
            ).rejects.toThrow(ConflictException);
        });

        it("throws NotFoundException when user does not exist", async () => {
            drizzleMock.limit.mockResolvedValue([]);

            jest.spyOn(service, "findOne").mockResolvedValue({
                ...mockQuartier,
                geojson: mockGeoJson,
            });

            await expect(
                service.addMember(QUARTIER_ID, { userId: USER_ID }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("removeMember", () => {
        it("removes a member successfully", async () => {
            drizzleMock.where.mockResolvedValue(undefined);

            await expect(
                service.removeMember(QUARTIER_ID, USER_ID),
            ).resolves.not.toThrow();
        });
    });

    describe("delete", () => {
        it("deletes a quartier with no members", async () => {
            drizzleMock.select.mockReturnValueOnce({
                ...drizzleMock,
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ count: 0 }]),
            });
            drizzleMock.limit.mockResolvedValue([mockQuartier]);

            await expect(service.delete(QUARTIER_ID)).resolves.not.toThrow();
        });

        it("throws BadRequestException when members still exist", async () => {
            drizzleMock.select.mockReturnValueOnce({
                ...drizzleMock,
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ count: 3 }]),
            });

            await expect(service.delete(QUARTIER_ID)).rejects.toThrow(
                BadRequestException,
            );
        });
    });
});
