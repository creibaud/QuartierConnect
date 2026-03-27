import { relations } from "drizzle-orm";
import {
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const quartiers = pgTable("quartiers", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),
    mongoGeoId: varchar("mongo_geo_id", { length: 24 }),
    adminUserId: uuid("admin_user_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const userQuartiers = pgTable(
    "user_quartiers",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        quartierId: uuid("quartier_id")
            .notNull()
            .references(() => quartiers.id, { onDelete: "cascade" }),
        addedAt: timestamp("added_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        uniqueUserAssignment: uniqueIndex().on(table.userId),
    }),
);

export const quartiersRelations = relations(quartiers, ({ one, many }) => ({
    admin: one(users, {
        fields: [quartiers.adminUserId],
        references: [users.id],
    }),
    userQuartiers: many(userQuartiers),
}));

export const userQuartiersRelations = relations(userQuartiers, ({ one }) => ({
    user: one(users, {
        fields: [userQuartiers.userId],
        references: [users.id],
    }),
    quartier: one(quartiers, {
        fields: [userQuartiers.quartierId],
        references: [quartiers.id],
    }),
}));

export type Quartier = typeof quartiers.$inferSelect;
export type NewQuartier = typeof quartiers.$inferInsert;

export type UserQuartier = typeof userQuartiers.$inferSelect;
export type NewUserQuartier = typeof userQuartiers.$inferInsert;
