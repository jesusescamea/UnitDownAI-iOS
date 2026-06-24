import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const PHOTO_CATEGORIES = [
  "nameplate",
  "wiring_diagram",
  "schematic",
  "technician_notes",
  "controls_board",
  "dip_switches",
  "electrical",
  "gas_heat",
  "compressor",
  "economizer",
  "before_repair",
  "after_repair",
  "other",
] as const;

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export const unitPhotos = pgTable(
  "unit_photos",
  {
    id: text("id").primaryKey(),
    unitId: text("unit_id").notNull(),
    userId: text("user_id").notNull(),
    // GCS object path — e.g. /objects/uploads/<uuid>
    // Serve via: GET /api/storage/objects/uploads/<uuid>
    objectPath: text("object_path").notNull(),
    category: text("category").notNull().default("other"),
    note: text("note"),
    // Extracted text from OpenAI vision OCR (set async after upload; null until ready)
    ocrText: text("ocr_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    unitUserIdx: index("unit_photos_unit_user_idx").on(table.unitId, table.userId),
    userIdx: index("unit_photos_user_idx").on(table.userId),
  }),
);

export const insertUnitPhotoSchema = createInsertSchema(unitPhotos).omit({
  createdAt: true,
  updatedAt: true,
});

export type UnitPhoto = typeof unitPhotos.$inferSelect;
export type InsertUnitPhoto = z.infer<typeof insertUnitPhotoSchema>;
