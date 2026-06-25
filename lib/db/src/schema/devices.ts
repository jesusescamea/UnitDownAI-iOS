import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

/**
 * Tracks trusted devices for each authenticated Clerk user.
 *
 * A row is upserted on every POST /api/devices/register call.
 * The fingerprint is a client-generated opaque string (FingerprintJS or
 * equivalent); it is never used for auth — purely for display / de-dup.
 *
 * Suspicious-activity is flagged server-side: if a user has ≥ SUSPICIOUS_DEVICE_THRESHOLD
 * distinct devices seen in the last 7 days, the listing endpoint sets
 * `suspicious: true` in the response. No account action is taken.
 */
export const userDevices = pgTable("user_devices", {
  id: text("id").primaryKey(),

  userId: text("user_id").notNull(),

  fingerprint: text("fingerprint").notNull(),

  deviceName: text("device_name").notNull().default("Unknown device"),

  deviceType: text("device_type").notNull().default("unknown"),

  browser: text("browser"),

  os: text("os"),

  isNew: boolean("is_new").notNull().default(true),

  isTrusted: boolean("is_trusted").notNull().default(true),

  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),

  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),

  seenCount: integer("seen_count").notNull().default(1),
});

export type UserDevice = typeof userDevices.$inferSelect;
export type InsertUserDevice = typeof userDevices.$inferInsert;
