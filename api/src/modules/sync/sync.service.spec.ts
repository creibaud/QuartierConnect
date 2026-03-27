import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { SyncService } from "src/modules/sync/sync.service";

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const INCIDENT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const pastDate = new Date("2026-01-01T00:00:00.000Z");
const recentDate = new Date("2026-03-01T00:00:00.000Z");
const futureDate = new Date("2026-06-01T00:00:00.000Z");

function buildDrizzleSelect(result: unknown[]) {
    return {
        from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(result),
            }),
        }),
    };
}

describe("SyncService", () => {
    let service: SyncService;
    let db: jest.Mocked<DrizzleDB>;

    beforeEach(() => {
        db = {
            select: jest.fn(),
            insert: jest.fn(),
            update: jest.fn(),
        } as unknown as jest.Mocked<DrizzleDB>;

        service = new SyncService(db);
    });

    describe("getDelta", () => {
        it("returns incidents modified after the given timestamp", async () => {
            const mockIncident = {
                id: INCIDENT_ID,
                title: "Broken streetlight",
                updatedAt: recentDate,
            };

            const selectChain = {
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([mockIncident]),
                }),
            };

            (db.select as jest.Mock).mockReturnValue(selectChain);

            const result = await service.getDelta(pastDate);

            expect(result.incidents).toHaveLength(1);
            expect(result.incidents[0].id).toBe(INCIDENT_ID);
            expect(result.syncedAt).toBeInstanceOf(Date);
        });

        it("returns empty incidents when nothing changed", async () => {
            const selectChain = {
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([]),
                }),
            };

            (db.select as jest.Mock).mockReturnValue(selectChain);

            const result = await service.getDelta(futureDate);

            expect(result.incidents).toHaveLength(0);
        });
    });

    describe("pushMutations", () => {
        it("applies mutation when client timestamp is newer than server", async () => {
            const serverIncident = { id: INCIDENT_ID, updatedAt: pastDate };

            (db.select as jest.Mock).mockReturnValue(
                buildDrizzleSelect([serverIncident]),
            );

            const updateReturning = jest.fn().mockResolvedValue([]);
            const updateWhere = jest
                .fn()
                .mockReturnValue({ returning: updateReturning });
            const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
            (db.update as jest.Mock).mockReturnValue({ set: updateSet });

            const result = await service.pushMutations(
                [
                    {
                        entityType: "incident",
                        entityId: INCIDENT_ID,
                        operation: "update",
                        data: { title: "Updated title" },
                        clientTimestamp: futureDate.toISOString(),
                    },
                ],
                ADMIN_ID,
            );

            expect(result.applied).toBe(1);
            expect(result.skipped).toBe(0);
            expect(result.conflicts).toHaveLength(0);
        });

        it("skips mutation when client timestamp is older than server (LWW)", async () => {
            const serverIncident = { id: INCIDENT_ID, updatedAt: futureDate };

            (db.select as jest.Mock).mockReturnValue(
                buildDrizzleSelect([serverIncident]),
            );

            const result = await service.pushMutations(
                [
                    {
                        entityType: "incident",
                        entityId: INCIDENT_ID,
                        operation: "update",
                        data: { title: "Stale update" },
                        clientTimestamp: pastDate.toISOString(),
                    },
                ],
                ADMIN_ID,
            );

            expect(result.applied).toBe(0);
            expect(result.skipped).toBe(1);
            expect(result.conflicts).toHaveLength(1);
            expect(result.conflicts[0].entityId).toBe(INCIDENT_ID);
        });
    });
});
