import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const vanInventory = pgTable("van_inventory", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull(),
  itemName:  text("item_name").notNull(),
  category:  text("category").notNull().default("Miscellaneous"),
  qty:       integer("qty").notNull().default(0),
  minQty:    integer("min_qty").notNull().default(1),
  unit:      text("unit").notNull().default("ea"),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type VanInventoryItem = typeof vanInventory.$inferSelect;
export type InsertVanInventoryItem = typeof vanInventory.$inferInsert;
