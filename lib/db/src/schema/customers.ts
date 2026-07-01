import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── customers ────────────────────────────────────────────────────────────────
// Top-level customer / business account. One tech may serve many customers.
// Soft-deleted via isArchived — never hard-deleted.

export const customers = pgTable(
  "customers",
  {
    id:           text("id").primaryKey(),
    userId:       text("user_id").notNull(),
    name:         text("name").notNull(),
    contactName:  text("contact_name"),
    phone:        text("phone"),
    email:        text("email"),
    address:      text("address"),
    city:         text("city"),
    state:        text("state"),
    zip:          text("zip"),
    billingNotes: text("billing_notes"),
    notes:        text("notes"),
    isArchived:   boolean("is_archived").notNull().default(false),
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userNameIdx: index("customers_user_name_idx").on(table.userId, table.name),
  }),
);

// ─── customer_sites ───────────────────────────────────────────────────────────
// A physical location (building, campus, rooftop, etc.) belonging to a customer.
// Equipment and jobs are linked here.

export const customerSites = pgTable(
  "customer_sites",
  {
    id:              text("id").primaryKey(),
    customerId:      text("customer_id").notNull(),
    userId:          text("user_id").notNull(),
    siteName:        text("site_name").notNull(),
    address:         text("address"),
    city:            text("city"),
    state:           text("state"),
    zip:             text("zip"),
    accessNotes:     text("access_notes"),
    roofAccessNotes: text("roof_access_notes"),
    gateCode:        text("gate_code"),
    parkingNotes:    text("parking_notes"),
    mainContact:     text("main_contact"),
    siteNotes:       text("site_notes"),
    isArchived:      boolean("is_archived").notNull().default(false),
    createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("customer_sites_customer_idx").on(table.customerId),
    userIdx:     index("customer_sites_user_idx").on(table.userId),
  }),
);

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const insertCustomerSchema = createInsertSchema(customers).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSiteSchema = createInsertSchema(customerSites).omit({
  createdAt: true,
  updatedAt: true,
});

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type Customer           = typeof customers.$inferSelect;
export type InsertCustomer     = z.infer<typeof insertCustomerSchema>;
export type CustomerSite       = typeof customerSites.$inferSelect;
export type InsertCustomerSite = z.infer<typeof insertCustomerSiteSchema>;
