import { relations } from "drizzle-orm";
import {
    boolean,
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { screenings } from "src/drizzle/schema";

export const roomTypeEnum = pgEnum("room_type", [
    "standard",
    "imax",
    "4dx",
    "vip",
    "3d",
]);

export const rooms = pgTable("rooms", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description").notNull(),
    type: roomTypeEnum("type").notNull().default("standard"),
    capacity: integer("capacity").notNull(),
    isHandicapAccess: boolean("is_handicap_access").notNull().default(false),
    isUnderMaintenance: boolean("is_under_maintenance")
        .notNull()
        .default(false),
    imageUrls: varchar("image_url", { length: 500 })
        .array()
        .notNull()
        .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const roomsRelations = relations(rooms, ({ many }) => ({
    screenings: many(screenings),
}));

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type RoomType = (typeof roomTypeEnum.enumValues)[number];
