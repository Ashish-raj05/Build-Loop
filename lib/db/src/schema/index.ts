import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const cadenceEnum = pgEnum("cadence", [
  "one_time",
  "weekly",
  "monthly",
  "quarterly",
]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientsTable = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    notes: text("notes"),
    cadence: cadenceEnum("cadence").notNull(),
    followUpDate: date("follow_up_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("clients_user_idx").on(t.userId),
  }),
);

export const followUpsTable = pgTable(
  "follow_ups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    scheduledDate: date("scheduled_date").notNull(),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    nextFollowUpDate: date("next_follow_up_date"),
    notesSnapshot: text("notes_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clientIdx: index("follow_ups_client_idx").on(t.clientId),
    scheduledIdx: index("follow_ups_scheduled_idx").on(t.scheduledDate),
  }),
);

export type User = typeof usersTable.$inferSelect;
export type Client = typeof clientsTable.$inferSelect;
export type FollowUp = typeof followUpsTable.$inferSelect;
export type Cadence = (typeof cadenceEnum.enumValues)[number];
