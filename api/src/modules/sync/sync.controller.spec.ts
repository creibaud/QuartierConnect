import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";

describe("SyncController", () => {
    let controller: SyncController;
    let service: SyncService;

    const mockAdmin = {
        id: "admin-uuid",
        email: "admin@test.local",
        role: "admin" as const,
        isActive: true,
    };

    const mockIncident = {
        id: "incident-uuid",
        title: "Rue barrée",
        status: "open",
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SyncController],
            providers: [
                {
                    provide: SyncService,
                    useValue: {
                        getDelta: jest.fn(),
                        pushMutations: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<SyncController>(SyncController);
        service = module.get<SyncService>(SyncService);
    });

    describe("getDelta", () => {
        it("should return changes since last sync timestamp", async () => {
            const query = { lastSyncTimestamp: "2026-03-27T10:00:00.000Z" };
            const delta = {
                incidents: [mockIncident],
                asOf: new Date(),
            };
            service.getDelta.mockResolvedValue(delta);

            const result = await controller.getDelta(query);

            expect(service.getDelta).toHaveBeenCalledWith(
                new Date(query.lastSyncTimestamp),
            );
            expect(result.incidents).toHaveLength(1);
        });

        it("should return empty delta if no changes", async () => {
            const query = { lastSyncTimestamp: "2026-03-27T10:00:00.000Z" };
            const delta = {
                incidents: [],
                events: [],
                services: [],
                asOf: new Date(),
            };
            service.getDelta.mockResolvedValue(delta);

            const result = await controller.getDelta(query);

            expect(result.incidents).toHaveLength(0);
        });

        it("should support multiple entity types in delta", async () => {
            const query = { lastSyncTimestamp: "2026-03-27T10:00:00.000Z" };
            const delta = {
                incidents: [mockIncident],
                events: [
                    { id: "event-uuid", title: "Event", updatedAt: new Date() },
                ],
                asOf: new Date(),
            };
            service.getDelta.mockResolvedValue(delta);

            const result = await controller.getDelta(query);

            expect(result).toHaveProperty("incidents");
            expect(result).toHaveProperty("events");
        });

        it("should filter by recent timestamp", async () => {
            const recentTime = new Date();
            const query = { lastSyncTimestamp: recentTime.toISOString() };
            const delta = { incidents: [], asOf: new Date() };
            service.getDelta.mockResolvedValue(delta);

            await controller.getDelta(query);

            expect(service.getDelta).toHaveBeenCalledWith(expect.any(Date));
        });

        it("should handle very old timestamps", async () => {
            const oldTime = new Date("2020-01-01");
            const query = { lastSyncTimestamp: oldTime.toISOString() };
            const delta = {
                incidents: [mockIncident],
                events: [],
                asOf: new Date(),
            };
            service.getDelta.mockResolvedValue(delta);

            const result = await controller.getDelta(query);

            expect(result).toBeDefined();
        });
    });

    describe("pushMutations", () => {
        it("should apply mutations from client", async () => {
            const mutations = [
                {
                    op: "create",
                    entity: "incident",
                    id: "new-id",
                    data: { title: "New incident" },
                },
            ];
            const pushDto = { mutations };
            const result = { applied: 1, skipped: 0, conflicts: [] };
            service.pushMutations.mockResolvedValue(result);

            const syncResult = await controller.pushMutations(
                pushDto,
                mockAdmin,
            );

            expect(service.pushMutations).toHaveBeenCalledWith(
                mutations,
                mockAdmin.id,
            );
            expect(syncResult.applied).toBe(1);
        });

        it("should handle conflicts in mutations", async () => {
            const mutations = [
                {
                    op: "update",
                    entity: "incident",
                    id: "conflict-id",
                    data: { status: "closed" },
                },
            ];
            const pushDto = { mutations };
            const result = {
                applied: 0,
                skipped: 0,
                conflicts: [{ id: "conflict-id", reason: "Version mismatch" }],
            };
            service.pushMutations.mockResolvedValue(result);

            const syncResult = await controller.pushMutations(
                pushDto,
                mockAdmin,
            );

            expect(syncResult.conflicts).toHaveLength(1);
        });

        it("should skip invalid mutations", async () => {
            const mutations = [
                { op: "delete", entity: "incident", id: "protected-id" },
            ];
            const pushDto = { mutations };
            const result = { applied: 0, skipped: 1, conflicts: [] };
            service.pushMutations.mockResolvedValue(result);

            const syncResult = await controller.pushMutations(
                pushDto,
                mockAdmin,
            );

            expect(syncResult.skipped).toBe(1);
        });

        it("should handle empty mutation list", async () => {
            const pushDto = { mutations: [] };
            const result = { applied: 0, skipped: 0, conflicts: [] };
            service.pushMutations.mockResolvedValue(result);

            const syncResult = await controller.pushMutations(
                pushDto,
                mockAdmin,
            );

            expect(syncResult.applied).toBe(0);
        });

        it("should support batch mutations", async () => {
            const mutations = [
                { op: "create", entity: "incident", id: "id1", data: {} },
                { op: "update", entity: "incident", id: "id2", data: {} },
                { op: "delete", entity: "incident", id: "id3", data: {} },
            ];
            const pushDto = { mutations };
            const result = { applied: 3, skipped: 0, conflicts: [] };
            service.pushMutations.mockResolvedValue(result);

            const syncResult = await controller.pushMutations(
                pushDto,
                mockAdmin,
            );

            expect(syncResult.applied).toBe(3);
        });

        it("should track which user initiated sync", async () => {
            const pushDto = { mutations: [] };
            service.pushMutations.mockResolvedValue({
                applied: 0,
                skipped: 0,
                conflicts: [],
            });

            await controller.pushMutations(pushDto, mockAdmin);

            expect(service.pushMutations).toHaveBeenCalledWith(
                expect.any(Array),
                mockAdmin.id,
            );
        });
    });

    describe("sync data consistency", () => {
        it("should maintain applied + skipped + conflicts count", async () => {
            const pushDto = {
                mutations: [
                    { op: "create", entity: "incident", id: "1", data: {} },
                ],
            };
            const result = { applied: 0, skipped: 1, conflicts: 0 };
            service.pushMutations.mockResolvedValue(result);

            const syncResult = await controller.pushMutations(
                pushDto,
                mockAdmin,
            );

            expect(
                syncResult.applied +
                    syncResult.skipped +
                    (syncResult.conflicts?.length || 0),
            ).toBe(1);
        });
    });
});
