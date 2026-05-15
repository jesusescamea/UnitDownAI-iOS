import { pgTable, text, jsonb, bigint, timestamp } from "drizzle-orm/pg-core";

export const userDiagnostics = pgTable("user_diagnostics", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  symptoms: text("symptoms").notNull(),
  result: jsonb("result").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserDiagnostic = typeof userDiagnostics.$inferSelect;
export type InsertUserDiagnostic = typeof userDiagnostics.$inferInsert;
