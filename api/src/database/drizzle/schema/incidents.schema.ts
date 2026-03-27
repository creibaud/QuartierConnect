import { relations } from "drizzle-orm";
import {
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const incidentStatusEnum = pgEnum("incident_status", [
    "open",
    "in_progress",
    "resolved",
    "closed",
]);

export const incidentPriorityEnum = pgEnum("incident_priority", [
    "low",
    "medium",
    "high",
    "critical",
]);

export const incidents = pgTable("incidents", {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: incidentStatusEnum("status").notNull().default("open"),
    priority: incidentPriorityEnum("priority").notNull().default("medium"),
    locationGeojson: jsonb("location_geojson"), // GeoJSON Point/Polygon
    attachmentUrls: text("attachment_urls").array().default([]),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
        onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const incidentComments = pgTable("incident_comments", {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id")
        .notNull()
        .references(() => incidents.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
    creator: one(users, {
        fields: [incidents.creatorId],
        references: [users.id],
    }),
    resolver: one(users, {
        fields: [incidents.resolvedBy],
        references: [users.id],
    }),
    comments: many(incidentComments),
}));

export const incidentCommentsRelations = relations(
    incidentComments,
    ({ one }) => ({
        incident: one(incidents, {
            fields: [incidentComments.incidentId],
            references: [incidents.id],
        }),
        author: one(users, {
            fields: [incidentComments.authorId],
            references: [users.id],
        }),
    }),
);

export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
export type IncidentStatus = (typeof incidentStatusEnum.enumValues)[number];
export type IncidentPriority = (typeof incidentPriorityEnum.enumValues)[number];

export type IncidentComment = typeof incidentComments.$inferSelect;
export type NewIncidentComment = typeof incidentComments.$inferInsert;
