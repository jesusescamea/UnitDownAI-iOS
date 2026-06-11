import { pgTable, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Stores manually-created timeline entries for a unit.
// "diagnostic" events are NOT stored here — they are synthesized at query
// time from the diagnostic_logs table and merged in the API response.
export const equipmentTimeline = pgTable("equipment_timeline", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull(),
  userId: text("user_id").notNull(),

  // "repair" | "note" | "maintenance" | "scan"
  eventType: text("event_type").notNull(),

  title: text("title").notNull(),
  description: text("description"),

  // "unresolved" | "monitoring" | "resolved" — optional (repairs only in practice)
  status: text("status"),

  technicianNotes: text("technician_notes"),
  cost: text("cost"),
  parts: text("parts"),

  linkedDiagnosticLogId: text("linked_diagnostic_log_id"),

  eventDate: bigint("event_date", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEquipmentTimelineSchema = createInsertSchema(equipmentTimeline).omit({
  createdAt: true,
  updatedAt: true,
});

export type EquipmentTimeline = typeof equipmentTimeline.$inferSelect;
export type InsertEquipmentTimeline = z.infer<typeof insertEquipmentTimelineSchema>;
