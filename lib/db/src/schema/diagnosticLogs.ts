import { pgTable, text, integer, jsonb, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const diagnosticLogs = pgTable("diagnostic_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  unitId: text("unit_id"),

  symptoms: text("symptoms").notNull(),
  diagnosisId: text("diagnosis_id"),
  diagnosisTitle: text("diagnosis_title"),
  confidencePercent: integer("confidence_percent"),
  result: jsonb("result"),

  technicianNotes: text("technician_notes"),
  status: text("status").notNull().default("unresolved"),
  resolutionNotes: text("resolution_notes"),

  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDiagnosticLogSchema = createInsertSchema(diagnosticLogs).omit({
  createdAt: true,
  updatedAt: true,
});

export type DiagnosticLog = typeof diagnosticLogs.$inferSelect;
export type InsertDiagnosticLog = z.infer<typeof insertDiagnosticLogSchema>;
