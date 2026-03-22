import { relations } from "drizzle-orm";
import { pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "src/drizzle/schema";

export const employeePositionEnum = pgEnum("employee_position", [
    "sweet_shop",
    "receptionist",
    "projectionist",
]);

export const employees = pgTable("employees", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    position: employeePositionEnum("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const employeesRelations = relations(employees, ({ one }) => ({
    user: one(users, {
        fields: [employees.userId],
        references: [users.id],
    }),
}));

export const usersEmployeesRelations = relations(users, ({ one }) => ({
    employee: one(employees),
}));

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type EmployeePosition = (typeof employeePositionEnum.enumValues)[number];
