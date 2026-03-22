import { relations } from "drizzle-orm";
import {
    numeric,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";
import { tickets, users } from "src/drizzle/schema";

export const transactionTypeEnum = pgEnum("transaction_type", [
    "deposit",
    "withdrawal",
    "ticket_purchase",
    "super_ticket_purchase",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
    "success",
    "pending",
    "failed",
]);

export const transactions = pgTable("transactions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    balanceAfter: numeric("balance_after", {
        precision: 10,
        scale: 2,
    }).notNull(),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
        onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
    user: one(users, {
        fields: [transactions.userId],
        references: [users.id],
    }),
    ticket: one(tickets, {
        fields: [transactions.ticketId],
        references: [tickets.id],
    }),
}));

export const usersTransactionsRelations = relations(users, ({ many }) => ({
    transactions: many(transactions),
}));

export const ticketsTransactionsRelations = relations(tickets, ({ many }) => ({
    transactions: many(transactions),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type TransactionStatus =
    (typeof transactionStatusEnum.enumValues)[number];
