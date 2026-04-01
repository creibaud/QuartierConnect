import { eq } from "drizzle-orm";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import {
    pointConfig,
    type PointConfig,
    type ServiceCategory,
} from "src/database/drizzle/schema";

export class AdminPointConfigRepository {
    constructor(private readonly db: DrizzleDB) {}

    async findAll(): Promise<PointConfig[]> {
        return this.db.select().from(pointConfig);
    }

    async findByCategory(
        category: ServiceCategory,
    ): Promise<PointConfig | null> {
        const [row] = await this.db
            .select()
            .from(pointConfig)
            .where(eq(pointConfig.category, category))
            .limit(1);

        return row ?? null;
    }

    async create(
        category: ServiceCategory,
        basePointsPerHour: string,
        multiplier: string,
        adminId: string,
    ): Promise<PointConfig> {
        const [created] = await this.db
            .insert(pointConfig)
            .values({
                category,
                basePointsPerHour,
                multiplier,
                updatedAt: new Date(),
                updatedBy: adminId,
            })
            .returning();

        return created;
    }

    async update(
        category: ServiceCategory,
        basePointsPerHour: string,
        multiplier: string,
        adminId: string,
    ): Promise<PointConfig | null> {
        const [updated] = await this.db
            .update(pointConfig)
            .set({
                basePointsPerHour,
                multiplier,
                updatedAt: new Date(),
                updatedBy: adminId,
            })
            .where(eq(pointConfig.category, category))
            .returning();

        return updated ?? null;
    }
}
