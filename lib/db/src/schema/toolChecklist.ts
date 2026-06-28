import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const toolChecklist = pgTable("tool_checklist", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull(),
  toolName:    text("tool_name").notNull(),
  category:    text("category").notNull().default("General"),
  hasItem:     boolean("has_item").notNull().default(true),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

export type ToolChecklistItem = typeof toolChecklist.$inferSelect;
export type InsertToolChecklistItem = typeof toolChecklist.$inferInsert;
