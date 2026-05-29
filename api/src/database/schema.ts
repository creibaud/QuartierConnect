import {
    index,
    integer,
    pgTable,
    real,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

export const revokedTokens = pgTable(
    "revoked_tokens",
    {
        jti: text("jti").primaryKey(),
        expiresAt: timestamp("expires_at").notNull(),
    },
    (t) => [index("revoked_tokens_expires_at_idx").on(t.expiresAt)],
);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    totpSecret: varchar("totp_secret", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("resident"),
    refreshTokenHash: text("refresh_token_hash"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const incidents = pgTable(
    "incidents",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        title: varchar("title", { length: 255 }).notNull(),
        description: text("description").notNull(),
        status: varchar("status", { length: 50 }).notNull().default("open"),
        createdBy: uuid("created_by")
            .notNull()
            .references(() => users.id),
        neighborhoodId: varchar("neighborhood_id", { length: 255 }),
        lat: real("lat"),
        lng: real("lng"),
        deletedAt: timestamp("deleted_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        index("incidents_status_idx").on(t.status),
        index("incidents_deleted_at_idx").on(t.deletedAt),
    ],
);

export const pointsBalances = pgTable("points_balances", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .notNull()
        .unique()
        .references(() => users.id),
    balance: integer("balance").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pointsTransactions = pgTable(
    "points_transactions",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        senderId: uuid("sender_id")
            .notNull()
            .references(() => users.id),
        recipientId: uuid("recipient_id")
            .notNull()
            .references(() => users.id),
        amount: integer("amount").notNull(),
        note: text("note"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [index("points_tx_sender_idx").on(t.senderId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
export type PointsBalance = typeof pointsBalances.$inferSelect;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
