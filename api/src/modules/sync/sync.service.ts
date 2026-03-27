import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq, gt } from "drizzle-orm";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import {
    incidents,
    type IncidentPriority,
    type IncidentStatus,
} from "src/database/drizzle/schema";
import { SyncMutation } from "src/modules/sync/dto/sync-push.dto";

type ConflictRecord = {
    entityId: string;
    reason: string;
    clientTimestamp: string;
    serverUpdatedAt: Date;
};

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(@Inject("DRIZZLE") private readonly db: DrizzleDB) {}

    async getDelta(lastSyncTimestamp: Date) {
        const changedIncidents = await this.db
            .select()
            .from(incidents)
            .where(gt(incidents.updatedAt, lastSyncTimestamp));

        return {
            incidents: changedIncidents,
            syncedAt: new Date(),
        };
    }

    async pushMutations(mutations: SyncMutation[], adminUserId: string) {
        let applied = 0;
        let skipped = 0;
        const conflicts: ConflictRecord[] = [];

        for (const mutation of mutations) {
            if (mutation.entityType !== "incident") {
                this.logger.warn(
                    `Unsupported entity type: ${String(mutation.entityType)}`,
                );
                skipped++;
                continue;
            }

            const [serverIncident] = await this.db
                .select({ id: incidents.id, updatedAt: incidents.updatedAt })
                .from(incidents)
                .where(eq(incidents.id, mutation.entityId))
                .limit(1);

            if (serverIncident) {
                const clientTime = new Date(mutation.clientTimestamp);
                const serverTime = serverIncident.updatedAt;

                if (clientTime <= serverTime) {
                    this.logger.warn(
                        `Conflict on incident ${mutation.entityId}: client timestamp is not newer than server`,
                    );
                    conflicts.push({
                        entityId: mutation.entityId,
                        reason: "Server timestamp is newer (server wins)",
                        clientTimestamp: mutation.clientTimestamp,
                        serverUpdatedAt: serverTime,
                    });
                    skipped++;
                    continue;
                }
            }

            await this.applyMutation(mutation, adminUserId);
            applied++;
        }

        this.logger.log(
            `Sync push by ${adminUserId}: ${applied} applied, ${skipped} skipped`,
        );

        return { applied, skipped, conflicts };
    }

    private async applyMutation(mutation: SyncMutation, adminUserId: string) {
        const data = mutation.data;
        const now = new Date();

        if (mutation.operation === "create") {
            await this.db
                .insert(incidents)
                .values({
                    id: mutation.entityId,
                    creatorId: adminUserId,
                    title: (data.title as string) ?? "Synced Incident",
                    description: data.description as string | undefined,
                    status: (data.status as IncidentStatus) ?? "open",
                    priority: (data.priority as IncidentPriority) ?? "medium",
                    updatedAt: now,
                })
                .onConflictDoNothing();

            return;
        }

        const updateData: Partial<typeof incidents.$inferInsert> = {
            updatedAt: now,
        };

        if (data.title) updateData.title = data.title as string;
        if (data.description !== undefined)
            updateData.description = data.description as string;
        if (data.status) updateData.status = data.status as IncidentStatus;
        if (data.priority)
            updateData.priority = data.priority as IncidentPriority;

        if (mutation.operation === "resolve") {
            updateData.status = "resolved";
            updateData.resolvedAt = now;
            updateData.resolvedBy = adminUserId;
        }

        await this.db
            .update(incidents)
            .set(updateData)
            .where(eq(incidents.id, mutation.entityId));
    }
}
