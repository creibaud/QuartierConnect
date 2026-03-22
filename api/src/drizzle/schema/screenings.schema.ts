import { relations } from "drizzle-orm";
import { numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { movies, rooms, tickets } from "src/drizzle/schema";

export const screenings = pgTable("screenings", {
    id: uuid("id").primaryKey().defaultRandom(),
    movieId: uuid("movie_id")
        .notNull()
        .references(() => movies.id, {
            onDelete: "cascade",
        }),
    roomId: uuid("room_id")
        .notNull()
        .references(() => rooms.id, {
            onDelete: "cascade",
        }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const screeningsRelations = relations(screenings, ({ one, many }) => ({
    movie: one(movies, {
        fields: [screenings.movieId],
        references: [movies.id],
    }),
    room: one(rooms, {
        fields: [screenings.roomId],
        references: [rooms.id],
    }),
    tickets: many(tickets),
}));

export const moviesScreeningsRelations = relations(movies, ({ many }) => ({
    screenings: many(screenings),
}));

export const roomsScreeningsRelations = relations(rooms, ({ many }) => ({
    screenings: many(screenings),
}));

export type Screening = typeof screenings.$inferSelect;
export type NewScreening = typeof screenings.$inferInsert;
