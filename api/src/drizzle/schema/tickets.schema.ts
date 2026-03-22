import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { screenings, users } from "src/drizzle/schema";

export const ticketTypeEnum = pgEnum("ticket_type", ["standard", "super"]);

export const ticketStatusEnum = pgEnum("ticket_status", [
    "active",
    "used",
    "expired",
]);

export const tickets = pgTable("tickets", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, {
            onDelete: "cascade",
        }),
    type: ticketTypeEnum("type").notNull().default("standard"),
    status: ticketStatusEnum("status").notNull().default("active"),
    remainingUses: integer("remaining_uses").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const ticketUsages = pgTable("ticket_usages", {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
        .notNull()
        .references(() => tickets.id, {
            onDelete: "cascade",
        }),
    screeningId: uuid("screening_id")
        .notNull()
        .references(() => screenings.id, {
            onDelete: "cascade",
        }),
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
    user: one(users, {
        fields: [tickets.userId],
        references: [users.id],
    }),
    usages: many(ticketUsages),
}));

export const ticketUsagesRelations = relations(ticketUsages, ({ one }) => ({
    ticket: one(tickets, {
        fields: [ticketUsages.ticketId],
        references: [tickets.id],
    }),
    screening: one(screenings, {
        fields: [ticketUsages.screeningId],
        references: [screenings.id],
    }),
}));

export const usersTicketsRelations = relations(users, ({ many }) => ({
    tickets: many(tickets),
}));

export const screeningsTicketUsagesRelations = relations(
    screenings,
    ({ many }) => ({
        ticketUsages: many(ticketUsages),
    }),
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketType = (typeof ticketTypeEnum.enumValues)[number];
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];

export type TicketUsage = typeof ticketUsages.$inferSelect;
export type NewTicketUsage = typeof ticketUsages.$inferInsert;
