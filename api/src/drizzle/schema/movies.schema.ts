import { relations } from "drizzle-orm";
import {
    integer,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { screenings } from "src/drizzle/schema";

export const movies = pgTable("movies", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    duration: integer("duration").notNull(), // Duration in minutes
    director: varchar("director", { length: 255 }).notNull(),
    genre: varchar("genre", { length: 255 }).notNull(),
    releaseYear: integer("release_year").notNull(),
    imageUrl: varchar("image_url", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const moviesRelations = relations(movies, ({ many }) => ({
    screenings: many(screenings),
}));

export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
