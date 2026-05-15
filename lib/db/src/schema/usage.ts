import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const freeUsage = pgTable("free_usage", {
  sessionId: text("session_id").primaryKey(),
  ip: text("ip").notNull().default(""),
  fingerprint: text("fingerprint").notNull().default(""),
  email: text("email"),
  useCount: integer("use_count").notNull().default(0),
  emailUnlocked: boolean("email_unlocked").notNull().default(false),
  emailUnlockUsed: boolean("email_unlock_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FreeUsage = typeof freeUsage.$inferSelect;
export type InsertFreeUsage = typeof freeUsage.$inferInsert;
