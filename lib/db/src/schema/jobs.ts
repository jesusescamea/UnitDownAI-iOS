import { pgTable, text, bigint, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

// ─── jobs ──────────────────────────────────────────────────────────────────────
// One row per service call. Status drives the lifecycle: active → paused →
// completed | cancelled. The `metadata` jsonb column is the primary extension
// hook — future features (Equipment Memory updates, predictive flags, etc.) add
// their output here without schema migrations.

export const jobs = pgTable("jobs", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull(),

  // Optional link to a unit_records row. Nullable because a technician may not
  // have identified the equipment when they first start a job.
  unitId:      text("unit_id"),

  // Denormalized display fields — duplicated from unit_records so that the job
  // header renders instantly without a join.
  customer:    text("customer"),
  site:        text("site"),
  unitLabel:   text("unit_label"),   // "RTU-1", "AHU-3", etc.
  title:       text("title"),        // auto-generated or user-set

  // Lifecycle: "active" | "paused" | "completed" | "cancelled"
  status:      text("status").notNull().default("active"),

  startedAt:   bigint("started_at",   { mode: "number" }).notNull(),
  updatedAt:   bigint("updated_at",   { mode: "number" }).notNull(),
  completedAt: bigint("completed_at", { mode: "number" }),

  // Extension hook — future systems write keyed sub-objects here.
  // e.g. { equipmentMemory: {...}, aiReport: {...}, invoiceSummary: {...} }
  metadata:    jsonb("metadata"),

  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── job_timeline_events ───────────────────────────────────────────────────────
// Every action a technician takes becomes a timeline event. This is the single
// source of truth for everything that happened during a service call.
//
// Event types (extensible — add new strings without migration):
//   dispatch | arrived | equipment_identified | alarm_review
//   voice_note | note | photo | measurement | part | recommendation
//   service_report | verification | completed
//
// Extension hooks:
//   - `measurements` jsonb: arbitrary key/value readings (future: typed schema)
//   - `parts` jsonb: part details (Phase 3 Parts Assistant output)
//   - `metadata` jsonb: catch-all for Smart Photos AI output, Equipment Memory
//     diffs, Predictive Maintenance signals, etc.

export const jobTimelineEvents = pgTable("job_timeline_events", {
  id:              text("id").primaryKey(),
  jobId:           text("job_id").notNull(),
  userId:          text("user_id").notNull(),

  eventType:       text("event_type").notNull(),
  title:           text("title").notNull(),
  timestamp:       bigint("timestamp", { mode: "number" }).notNull(),

  notes:           text("notes"),
  voiceTranscript: text("voice_transcript"),
  voiceCorrected:  text("voice_corrected"),

  // Phase 2 — object storage paths (not URLs) for retrieved via signed URL
  photoUrls:       text("photo_urls").array(),

  // Phase 1 — free-form key/value measurements ({ suctionPressure: "72 psi" })
  // Phase 3 — will be superseded by typed measurement schemas
  measurements:    jsonb("measurements"),

  // Phase 3 — Parts Assistant structured output
  parts:           jsonb("parts"),

  // Extension hook — AI enrichment, smart photo results, memory updates, etc.
  metadata:        jsonb("metadata"),

  // For stable ordering when two events share the same millisecond timestamp
  sequenceNum:     integer("sequence_num").notNull().default(0),

  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type Job                = typeof jobs.$inferSelect;
export type InsertJob          = typeof jobs.$inferInsert;
export type JobTimelineEvent   = typeof jobTimelineEvents.$inferSelect;
export type InsertJobTimelineEvent = typeof jobTimelineEvents.$inferInsert;
