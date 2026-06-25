import { pgTable, text, boolean, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scheduledEvents = pgTable("scheduled_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  unitId: text("unit_id"),

  title: text("title").notNull(),
  eventType: text("event_type").notNull().default("reminder"),
  scheduledDate: bigint("scheduled_date", { mode: "number" }).notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  notes: text("notes"),
  recurrence: text("recurrence"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScheduledEventSchema = createInsertSchema(scheduledEvents).omit({
  createdAt: true,
  updatedAt: true,
});

export type ScheduledEvent = typeof scheduledEvents.$inferSelect;
export type InsertScheduledEvent = z.infer<typeof insertScheduledEventSchema>;
