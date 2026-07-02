import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { IncidentsController } from "./incidents.controller";

const mockIncident = {
    id: "inc-uuid-1",
    title: "Fuite d'eau",
    description: "Rue principale",
    status: "open",
    createdBy: "user-uuid-1",
    deletedAt: null,
};

const authReq = (
    sub = "user-uuid-1",
    role = "resident",
    neighborhoodId: string | null = "n1",
) => ({ user: { sub, role, neighborhoodId } });

function buildMockDb(defaultRows = [mockIncident]) {
    const mock: any = {};

    mock.select = jest.fn().mockReturnValue(mock);
    mock.from = jest.fn().mockReturnValue(mock);
    mock.where = jest.fn().mockReturnValue(mock);
    mock.offset = jest.fn().mockReturnValue(mock);
    mock.limit = jest.fn().mockResolvedValue(defaultRows);
    mock.insert = jest.fn().mockReturnValue(mock);
    mock.values = jest.fn().mockReturnValue(mock);
    mock.returning = jest.fn().mockResolvedValue(defaultRows);
    mock.update = jest.fn().mockReturnValue(mock);
    mock.set = jest.fn().mockReturnValue(mock);
    mock.onConflictDoUpdate = jest.fn().mockReturnValue(mock);

    mock.orderBy = jest.fn().mockReturnValue(mock);
    mock.onConflictDoUpdate = jest.fn().mockReturnValue(mock);

    mock.where.mockImplementation(() => {
        const chain: any = {};
        chain.orderBy = jest.fn().mockReturnValue(chain);
        chain.offset = jest.fn().mockReturnValue(chain);
        chain.limit = jest.fn().mockResolvedValue(defaultRows);
        chain.returning = jest.fn().mockResolvedValue(defaultRows);
        chain[Symbol.iterator] = undefined;
        Object.defineProperty(chain, "then", {
            get() {
                return (resolve: any, reject: any) =>
                    Promise.resolve(defaultRows).then(resolve, reject);
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return chain;
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return mock;
}

describe("IncidentsController", () => {
    let controller: IncidentsController;
    let mockDb: any;

    beforeEach(async () => {
        mockDb = buildMockDb();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [IncidentsController],
            providers: [{ provide: DRIZZLE_TOKEN, useValue: mockDb }],
        }).compile();

        controller = module.get<IncidentsController>(IncidentsController);
    });

    it("GET /incidents returns list without filter (resident, scoped)", async () => {
        await controller.findAll(undefined, "1", "20", authReq() as any);
        expect(mockDb.select).toHaveBeenCalled();
    });

    it("GET /incidents?status=open filters by status", async () => {
        await controller.findAll("open", "1", "20", authReq() as any);
        expect(mockDb.select).toHaveBeenCalled();
    });

    it("GET /incidents returns [] for a resident with no neighborhood", async () => {
        const result = await controller.findAll(
            undefined,
            "1",
            "20",
            authReq("u", "resident", null) as any,
        );
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("GET /incidents lets an admin query across all neighborhoods", async () => {
        await controller.findAll(
            undefined,
            "1",
            "20",
            authReq("admin1", "admin", null) as any,
        );
        expect(mockDb.select).toHaveBeenCalled();
    });

    it("GET /incidents scopes a moderator to their own neighborhood", async () => {
        const result = await controller.findAll(
            undefined,
            "1",
            "20",
            authReq("mod1", "moderator", null) as any,
        );
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("GET /incidents/:id returns one", async () => {
        const result = await controller.findOne("inc-uuid-1");
        expect(result).toEqual(mockIncident);
    });

    it("GET /incidents/:id throws 404 for missing/deleted incident", async () => {
        mockDb = buildMockDb([]);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [IncidentsController],
            providers: [{ provide: DRIZZLE_TOKEN, useValue: mockDb }],
        }).compile();
        controller = module.get<IncidentsController>(IncidentsController);
        await expect(controller.findOne("deleted-id")).rejects.toThrow(
            NotFoundException,
        );
    });

    it("POST /incidents sets createdBy from JWT", async () => {
        await controller.create(
            { title: "Test", description: "Desc" },
            authReq() as any,
        );
        expect(mockDb.values).toHaveBeenCalledWith(
            expect.objectContaining({
                createdBy: "user-uuid-1",
                status: "open",
            }),
        );
    });

    it("POST /incidents persists the category", async () => {
        await controller.create(
            { title: "T", description: "D", category: "neighborhood" } as any,
            authReq() as any,
        );
        expect(mockDb.values).toHaveBeenCalledWith(
            expect.objectContaining({ category: "neighborhood" }),
        );
    });

    it("POST /incidents defaults category to neighborhood", async () => {
        await controller.create(
            { title: "T", description: "D" } as any,
            authReq() as any,
        );
        expect(mockDb.values).toHaveBeenCalledWith(
            expect.objectContaining({ category: "neighborhood" }),
        );
    });

    it("PATCH /incidents/:id/status transitions open → in_progress", async () => {
        const result = await controller.updateStatus("inc-uuid-1", {
            status: "in_progress",
        });
        expect(result).toBeDefined();
    });

    it("PATCH /incidents/:id/status rejects invalid transition (open → resolved)", async () => {
        await expect(
            controller.updateStatus("inc-uuid-1", { status: "resolved" }),
        ).rejects.toThrow(BadRequestException);
    });

    it("PATCH /incidents/:id/status rejects unknown source status", async () => {
        mockDb = buildMockDb([{ ...mockIncident, status: "unknown_status" }]);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [IncidentsController],
            providers: [{ provide: DRIZZLE_TOKEN, useValue: mockDb }],
        }).compile();
        controller = module.get<IncidentsController>(IncidentsController);
        await expect(
            controller.updateStatus("inc-uuid-1", { status: "open" }),
        ).rejects.toThrow(BadRequestException);
    });

    it("PATCH /incidents/:id/status rejects backward transition (resolved → open)", async () => {
        mockDb = buildMockDb([{ ...mockIncident, status: "resolved" }]);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [IncidentsController],
            providers: [{ provide: DRIZZLE_TOKEN, useValue: mockDb }],
        }).compile();
        controller = module.get<IncidentsController>(IncidentsController);
        await expect(
            controller.updateStatus("inc-uuid-1", { status: "open" }),
        ).rejects.toThrow(BadRequestException);
    });

    it("DELETE /incidents/:id sets deletedAt (soft delete)", async () => {
        const result = await controller.remove("inc-uuid-1");
        expect(result).toEqual({ success: true });
        expect(mockDb.set).toHaveBeenCalledWith(
            expect.objectContaining({ deletedAt: expect.any(Date) }),
        );
    });

    it("DELETE /incidents/:id throws 404 for missing incident", async () => {
        mockDb = buildMockDb([]);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [IncidentsController],
            providers: [{ provide: DRIZZLE_TOKEN, useValue: mockDb }],
        }).compile();
        controller = module.get<IncidentsController>(IncidentsController);
        await expect(controller.remove("bad-id")).rejects.toThrow(
            NotFoundException,
        );
    });

    it("POST /incidents/sync skips items from other users", async () => {
        const result = await controller.sync(
            {
                incidents: [
                    {
                        id: "inc-1",
                        title: "T1",
                        description: "D1",
                        createdBy: "user-uuid-1",
                    },
                    {
                        id: "inc-2",
                        title: "T2",
                        description: "D2",
                        createdBy: "other-user",
                    },
                ],
            },
            authReq() as any,
        );
        expect(result.upserted).toBe(1);
        expect(result.skipped).toBe(1);
    });

    it("POST /incidents/sync returns 0 upserted for all-foreign payload", async () => {
        const result = await controller.sync(
            {
                incidents: [
                    {
                        id: "inc-2",
                        title: "T2",
                        description: "D2",
                        createdBy: "other-user",
                    },
                ],
            },
            authReq() as any,
        );
        expect(result.upserted).toBe(0);
        expect(result.skipped).toBe(1);
    });

    it("POST /incidents/sync preserves status from client payload", async () => {
        const valuesSpy = jest.fn().mockReturnValue({
            onConflictDoUpdate: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
            }),
        });
        mockDb = {
            insert: jest.fn().mockReturnValue({ values: valuesSpy }),
        } as any;
        const module = await Test.createTestingModule({
            controllers: [IncidentsController],
            providers: [{ provide: DRIZZLE_TOKEN, useValue: mockDb }],
        }).compile();
        controller = module.get<IncidentsController>(IncidentsController);

        await controller.sync(
            {
                incidents: [
                    {
                        id: "inc-status-1",
                        title: "T",
                        description: "D",
                        createdBy: "user-uuid-1",
                        status: "in_progress",
                    },
                ],
            },
            authReq() as any,
        );

        const insertedValues = valuesSpy.mock.calls[0][0];
        expect(insertedValues[0].status).toBe("in_progress");
    });

    interface SyncMockDb {
        db: any;
        valuesSpy: jest.Mock;
        onConflictSpy: jest.Mock;
    }

    function buildSyncMockDb(upsertedIds: string[]): SyncMockDb {
        const returningSpy = jest
            .fn()
            .mockResolvedValue(upsertedIds.map((id) => ({ id })));
        const onConflictSpy = jest
            .fn()
            .mockReturnValue({ returning: returningSpy });
        const valuesSpy = jest
            .fn()
            .mockReturnValue({ onConflictDoUpdate: onConflictSpy });
        return {
            db: { insert: jest.fn().mockReturnValue({ values: valuesSpy }) },
            valuesSpy,
            onConflictSpy,
        };
    }

    async function compileWithDb(db: any): Promise<IncidentsController> {
        const module = await Test.createTestingModule({
            controllers: [IncidentsController],
            providers: [{ provide: DRIZZLE_TOKEN, useValue: db }],
        }).compile();
        return module.get<IncidentsController>(IncidentsController);
    }

    it("POST /incidents/sync lets a moderator upsert a foreign incident", async () => {
        const sync = buildSyncMockDb(["inc-foreign-1"]);
        controller = await compileWithDb(sync.db);

        const result = await controller.sync(
            {
                incidents: [
                    {
                        id: "inc-foreign-1",
                        title: "Foreign",
                        description: "Owned by a resident",
                        createdBy: "other-user",
                    },
                ],
            },
            authReq("mod-uuid-1", "moderator") as any,
        );

        expect(result).toEqual({
            upserted: 1,
            skipped: 0,
            skippedIds: [],
        });
    });

    it("POST /incidents/sync preserves the original owner for moderator upserts", async () => {
        const sync = buildSyncMockDb(["inc-foreign-1"]);
        controller = await compileWithDb(sync.db);

        await controller.sync(
            {
                incidents: [
                    {
                        id: "inc-foreign-1",
                        title: "Foreign",
                        description: "D",
                        createdBy: "other-user",
                    },
                ],
            },
            authReq("mod-uuid-1", "moderator") as any,
        );

        const insertedValues = sync.valuesSpy.mock.calls[0][0];
        expect(insertedValues[0].createdBy).toBe("other-user");
    });

    it("POST /incidents/sync drops the ownership guard for admins", async () => {
        const sync = buildSyncMockDb(["inc-foreign-1"]);
        controller = await compileWithDb(sync.db);

        await controller.sync(
            {
                incidents: [
                    {
                        id: "inc-foreign-1",
                        title: "Foreign",
                        description: "D",
                        createdBy: "other-user",
                    },
                ],
            },
            authReq("admin-uuid-1", "admin") as any,
        );

        const conflictConfig = sync.onConflictSpy.mock.calls[0][0];
        expect(conflictConfig.where).toBeUndefined();
    });

    it("POST /incidents/sync keeps the ownership guard for residents", async () => {
        const sync = buildSyncMockDb(["inc-1"]);
        controller = await compileWithDb(sync.db);

        await controller.sync(
            {
                incidents: [
                    {
                        id: "inc-1",
                        title: "Mine",
                        description: "D",
                        createdBy: "user-uuid-1",
                    },
                ],
            },
            authReq() as any,
        );

        const conflictConfig = sync.onConflictSpy.mock.calls[0][0];
        expect(conflictConfig.where).toBeDefined();
    });

    it("POST /incidents/sync reports skippedIds for items the DB did not upsert", async () => {
        const sync = buildSyncMockDb(["inc-1"]);
        controller = await compileWithDb(sync.db);

        const result = await controller.sync(
            {
                incidents: [
                    {
                        id: "inc-1",
                        title: "Mine",
                        description: "D",
                        createdBy: "user-uuid-1",
                    },
                    {
                        id: "inc-hijack",
                        title: "Someone else's id",
                        description: "D",
                        createdBy: "user-uuid-1",
                    },
                ],
            },
            authReq() as any,
        );

        expect(result.upserted).toBe(1);
        expect(result.skipped).toBe(1);
        expect(result.skippedIds).toEqual(["inc-hijack"]);
    });

    it("POST /incidents/sync returns all ids as skipped for an all-foreign resident payload", async () => {
        const sync = buildSyncMockDb([]);
        controller = await compileWithDb(sync.db);

        const result = await controller.sync(
            {
                incidents: [
                    {
                        id: "inc-2",
                        title: "T2",
                        description: "D2",
                        createdBy: "other-user",
                    },
                ],
            },
            authReq() as any,
        );

        expect(result).toEqual({
            upserted: 0,
            skipped: 1,
            skippedIds: ["inc-2"],
        });
        expect(sync.db.insert).not.toHaveBeenCalled();
    });
});
