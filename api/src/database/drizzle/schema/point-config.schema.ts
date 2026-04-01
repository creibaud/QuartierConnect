import { numeric, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const SERVICE_CATEGORIES = [
    "gardening",
    "repair",
    "cleaning",
    "babysitting",
    "tutoring",
    "delivery",
    "moving",
    "cooking",
    "other",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const pointConfig = pgTable("point_config", {
    category: varchar("category", { length: 50 })
        .primaryKey()
        .$type<ServiceCategory>(),
    basePointsPerHour: numeric("base_points_per_hour", {
        precision: 5,
        scale: 2,
    })
        .notNull()
        .default("2.00"),
    multiplier: numeric("multiplier", { precision: 5, scale: 2 })
        .notNull()
        .default("1.00"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedBy: uuid("updated_by").references(() => users.id, {
        onDelete: "set null",
    }),
});

export type PointConfig = typeof pointConfig.$inferSelect;
export type NewPointConfig = typeof pointConfig.$inferInsert;
