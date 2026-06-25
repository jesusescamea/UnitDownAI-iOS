import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const unitRecords = pgTable(
  "unit_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),

    siteCustomerName: text("site_customer_name"),
    nickname: text("nickname"),
    location: text("location"),

    manufacturer: text("manufacturer"),
    modelNumber: text("model_number"),
    serialNumber: text("serial_number"),
    // Normalized serial: uppercase, stripped of spaces/dashes/periods/special chars.
    // Populated on every insert/update for fast indexed duplicate detection.
    serialNumberNormalized: text("serial_number_normalized"),
    equipmentType: text("equipment_type"),
    systemType: text("system_type"),

    refrigerantType: text("refrigerant_type"),
    voltage: text("voltage"),
    phase: text("phase"),
    mca: text("mca"),
    mocp: text("mocp"),
    rla: text("rla"),
    lra: text("lra"),
    capacityTons: text("capacity_tons"),
    manufactureDate: text("manufacture_date"),
    notes: text("notes"),

    nameplateImageUrl: text("nameplate_image_url"),
    nameplatePreviewUrl: text("nameplate_preview_url"),

    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Index for fast duplicate serial lookups scoped to a user
    userSerialNormIdx: index("unit_records_user_serial_norm_idx").on(
      table.userId,
      table.serialNumberNormalized,
    ),
  }),
);

export const insertUnitRecordSchema = createInsertSchema(unitRecords).omit({
  createdAt: true,
  updatedAt: true,
});

export type UnitRecord = typeof unitRecords.$inferSelect;
export type InsertUnitRecord = z.infer<typeof insertUnitRecordSchema>;
