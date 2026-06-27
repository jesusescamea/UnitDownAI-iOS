import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { jobs, jobTimelineEvents, usrSequences } from "@workspace/db";
import type { Job, JobTimelineEvent } from "@workspace/db";

const jobsRouter: IRouter = Router();

// ─── Auth helper ──────────────────────────────────────────────────────────────

function requireUserId(req: Request, res: Response): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (req as any).auth?.userId as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

// ─── ID generator ─────────────────────────────────────────────────────────────

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── USR ID generator (atomic, never-reused) ─────────────────────────────────
// Uses a per-year counter in usr_sequences with INSERT...ON CONFLICT DO UPDATE.
// Atomic at the DB level — safe for concurrent requests.

async function generateUsrId(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.execute(sql`
    INSERT INTO usr_sequences (year, last_counter)
    VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE
    SET last_counter = usr_sequences.last_counter + 1
    RETURNING last_counter
  `);
  const counter = (result.rows[0] as { last_counter: number }).last_counter;
  return `USR-${year}-${String(counter).padStart(6, "0")}`;
}

// ─── Service Record assembler ─────────────────────────────────────────────────
// Reads job + events and assembles the full USS service record structure.
// All sections are always present — missing data shows as null/empty array,
// never omitted. This ensures the record is structurally complete even when
// data is sparse (e.g. a short call with only voice notes).

function assembleServiceRecord(job: Job, events: JobTimelineEvent[]) {
  // ── Measurements: aggregate all key/value pairs from measurement events ──
  const measurementMap: Record<string, string[]> = {};
  for (const evt of events) {
    if (evt.measurements) {
      const m = evt.measurements as Record<string, unknown>;
      for (const [k, v] of Object.entries(m)) {
        if (v !== null && v !== undefined && v !== "") {
          if (!measurementMap[k]) measurementMap[k] = [];
          measurementMap[k].push(String(v));
        }
      }
    }
  }

  // ── Parts: aggregate from part events and recommendation events ───────────
  interface PartEntry {
    description: string;
    quantity?: string | number;
    partNumber?: string;
    eventId: string;
    timestamp: number;
  }
  const partsReplaced: PartEntry[] = [];
  const partsRecommended: PartEntry[] = [];

  for (const evt of events) {
    if (evt.eventType === "part" && evt.parts) {
      const p = evt.parts as Record<string, unknown>;
      const entry: PartEntry = {
        description: String(p.description ?? p.name ?? "Unknown part"),
        quantity: p.quantity as string | number | undefined,
        partNumber: p.partNumber as string | undefined,
        eventId: evt.id,
        timestamp: evt.timestamp,
      };
      if (p.status === "recommended") {
        partsRecommended.push(entry);
      } else {
        partsReplaced.push(entry);
      }
    }
    // Recommendations without a part event also contribute to recommendations
    if (evt.eventType === "recommendation" && evt.notes && !evt.parts) {
      partsRecommended.push({
        description: evt.notes,
        eventId: evt.id,
        timestamp: evt.timestamp,
      });
    }
  }

  // ── Photos: categorize by metadata.photoCategory ──────────────────────────
  const photos: Record<string, string[]> = {
    overview: [],
    nameplate: [],
    alarmScreen: [],
    measurements: [],
    failedParts: [],
    installedParts: [],
    verification: [],
    general: [],
  };

  for (const evt of events) {
    if (evt.photoUrls && evt.photoUrls.length > 0) {
      const meta = evt.metadata as Record<string, unknown> | null;
      const rawCategory = meta?.photoCategory as string | undefined;
      const category = rawCategory && rawCategory in photos ? rawCategory : "general";
      photos[category].push(...evt.photoUrls);
    }
  }

  // ── AI Report: from job.metadata ──────────────────────────────────────────
  const jobMeta = job.metadata as Record<string, unknown> | null;
  const aiReportData = jobMeta?.aiReport as Record<string, unknown> | null;

  // ── Equipment Memory: from event metadata.memoryExtracts ─────────────────
  const memoryUpdates: string[] = [];
  for (const evt of events) {
    const evtMeta = evt.metadata as Record<string, unknown> | null;
    const extracts = evtMeta?.memoryExtracts as Record<string, unknown> | null;
    if (extracts) {
      for (const [k, v] of Object.entries(extracts)) {
        if (v !== null && v !== undefined && v !== "" &&
            !Array.isArray(v) && typeof v !== "object") {
          memoryUpdates.push(`${k}: ${v}`);
        } else if (Array.isArray(v) && v.length > 0) {
          for (const item of v) {
            if (item) memoryUpdates.push(`${k}: ${String(item)}`);
          }
        }
      }
    }
  }

  // ── Verification: from the verification event ─────────────────────────────
  const verificationEvt = events.find((e) => e.eventType === "verification");
  const verMeta = verificationEvt?.metadata as Record<string, unknown> | null;

  return {
    job,
    usrId: job.usrId ?? null,
    serviceRecordStatus: job.serviceRecordStatus ?? "draft",
    generatedAt: Date.now(),
    timeline: events,
    measurements: Object.keys(measurementMap).length > 0 ? measurementMap : null,
    parts: {
      replaced: partsReplaced,
      recommended: partsRecommended,
      pending: [] as PartEntry[],
      unknown: [] as PartEntry[],
    },
    photos,
    aiReport: {
      professional: (aiReportData?.professional as string | null) ?? null,
      customerSummary: (aiReportData?.customerSummary as string | null) ?? null,
      invoiceSummary: (aiReportData?.invoiceSummary as string | null) ?? null,
      confidence: (aiReportData?.confidence as number | null) ?? null,
      officeReady: (aiReportData?.officeReady as boolean | null) ?? null,
      completenessScore: (aiReportData?.completenessScore as number | null) ?? null,
    },
    equipmentMemory: {
      updates: memoryUpdates,
    },
    verification: {
      operationalStatus: (verMeta?.operationalStatus as string | null) ?? null,
      verifiedBy: (verMeta?.verifiedBy as string | null) ?? null,
      notes: verificationEvt?.notes ?? null,
      followUpRequired: Boolean(verMeta?.followUpRequired),
      returnVisit: Boolean(verMeta?.returnVisit),
      safetyConcerns: Boolean(verMeta?.safetyConcerns),
      warrantyMention: Boolean(verMeta?.warrantyMention),
    },
    exportFormats: [
      "pdf",
      "customer_copy",
      "office_copy",
      "json",
      "uss_archive",
      "print",
      "email",
      "share",
    ],
  };
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const CreateJobSchema = z.object({
  id:        z.string().optional(),
  unitId:    z.string().optional(),
  customer:  z.string().optional(),
  site:      z.string().optional(),
  unitLabel: z.string().optional(),
  title:     z.string().optional(),
});

const UpdateJobSchema = z.object({
  status:               z.enum(["active", "paused", "completed", "cancelled"]).optional(),
  title:                z.string().optional(),
  unitId:               z.string().optional(),
  customer:             z.string().optional(),
  site:                 z.string().optional(),
  unitLabel:            z.string().optional(),
  completedAt:          z.number().optional(),
  serviceRecordStatus:  z.enum(["draft", "completed", "verified", "archived"]).optional(),
  metadata:             z.record(z.string(), z.unknown()).optional(),
});

const CreateEventSchema = z.object({
  id:              z.string().optional(),
  eventType:       z.string(),
  title:           z.string(),
  timestamp:       z.number().optional(),
  notes:           z.string().optional(),
  voiceTranscript: z.string().optional(),
  voiceCorrected:  z.string().optional(),
  photoUrls:       z.array(z.string()).optional(),
  measurements:    z.record(z.string(), z.unknown()).optional(),
  parts:           z.unknown().optional(),
  metadata:        z.record(z.string(), z.unknown()).optional(),
  sequenceNum:     z.number().int().optional(),
});

const UpdateEventSchema = z.object({
  title:           z.string().optional(),
  notes:           z.string().optional(),
  voiceTranscript: z.string().optional(),
  voiceCorrected:  z.string().optional(),
  photoUrls:       z.array(z.string()).optional(),
  measurements:    z.record(z.string(), z.unknown()).optional(),
  parts:           z.unknown().optional(),
  metadata:        z.record(z.string(), z.unknown()).optional(),
});

// ─── GET /jobs — list all jobs for the authenticated user ─────────────────────

jobsRouter.get("/jobs", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const result = await db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.startedAt));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list jobs");
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

// ─── POST /jobs — create a new job session ────────────────────────────────────

jobsRouter.post("/jobs", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = CreateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const now = Date.now();
  const jobId = parsed.data.id ?? newId("job");
  const newJob = {
    id:          jobId,
    userId,
    unitId:      parsed.data.unitId      ?? null,
    customer:    parsed.data.customer    ?? null,
    site:        parsed.data.site        ?? null,
    unitLabel:   parsed.data.unitLabel   ?? null,
    title:       parsed.data.title       ?? null,
    status:      "active" as const,
    startedAt:   now,
    updatedAt:   now,
    completedAt: null,
    usrId:       null,
    serviceRecordStatus: "draft",
    metadata:    null,
  };

  try {
    await db.insert(jobs).values(newJob).onConflictDoNothing();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    req.log.info({ jobId: job.id }, "Job created or already existed");
    res.status(201).json(job);
  } catch (err) {
    req.log.error({ err }, "Failed to create job");
    res.status(500).json({ error: "Failed to create job" });
  }
});

// ─── GET /jobs/:jobId — get job with timeline events ──────────────────────────

jobsRouter.get("/jobs/:jobId", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const jobId = String(req.params.jobId);

  try {
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const events = await db
      .select()
      .from(jobTimelineEvents)
      .where(
        and(
          eq(jobTimelineEvents.jobId, jobId),
          eq(jobTimelineEvents.userId, userId),
        ),
      )
      .orderBy(jobTimelineEvents.timestamp, jobTimelineEvents.sequenceNum);

    res.json({ job, events });
  } catch (err) {
    req.log.error({ err }, "Failed to get job");
    res.status(500).json({ error: "Failed to get job" });
  }
});

// ─── PATCH /jobs/:jobId — update job metadata / status ───────────────────────

jobsRouter.patch("/jobs/:jobId", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const jobId = String(req.params.jobId);
  const parsed = UpdateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const [existing] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));

    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const [updated] = await db
      .update(jobs)
      .set({ ...parsed.data, updatedAt: Date.now() })
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update job");
    res.status(500).json({ error: "Failed to update job" });
  }
});

// ─── DELETE /jobs/:jobId — cancel and remove a job ───────────────────────────

jobsRouter.delete("/jobs/:jobId", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const jobId = String(req.params.jobId);

  try {
    const [existing] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));

    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    await db.delete(jobTimelineEvents).where(eq(jobTimelineEvents.jobId, jobId));
    await db.delete(jobs).where(eq(jobs.id, jobId));

    req.log.info({ jobId }, "Job deleted");
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete job");
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// ─── POST /jobs/:jobId/complete — complete a job and generate USR ID ──────────
// This is the canonical completion endpoint. It:
//   1. Validates the job exists and is owned by this user
//   2. Atomically generates a permanent USR ID via usr_sequences
//   3. Marks the job completed and sets the service record status
//   4. Creates the "completed" timeline event (idempotent — skips if exists)
//   5. Returns the updated job row
//
// Idempotent: if the job already has a USR ID (previously completed), the
// existing USR ID is preserved — the counter is NOT incremented again.

jobsRouter.post("/jobs/:jobId/complete", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const jobId = String(req.params.jobId);

  try {
    const [existing] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));

    if (!existing) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const now = Date.now();

    // Idempotency: if already completed and has a USR ID, return as-is
    if (existing.usrId) {
      req.log.info({ jobId, usrId: existing.usrId }, "Job already completed, returning existing record");
      const events = await db
        .select()
        .from(jobTimelineEvents)
        .where(and(eq(jobTimelineEvents.jobId, jobId), eq(jobTimelineEvents.userId, userId)))
        .orderBy(jobTimelineEvents.timestamp, jobTimelineEvents.sequenceNum);
      res.json({ job: existing, events });
      return;
    }

    // Generate the permanent USR ID
    const usrId = await generateUsrId();

    // Update job: completed status + USR ID + service record status
    const [completedJob] = await db
      .update(jobs)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
        usrId,
        serviceRecordStatus: "completed",
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
      .returning();

    // Create "completed" timeline event (idempotent)
    const completedEventId = newId("evt");
    await db
      .insert(jobTimelineEvents)
      .values({
        id:          completedEventId,
        jobId,
        userId,
        eventType:   "completed",
        title:       "Job Completed",
        timestamp:   now,
        sequenceNum: 999,
        notes:       null,
        voiceTranscript: null,
        voiceCorrected:  null,
        photoUrls:   null,
        measurements: null,
        parts:       null,
        metadata:    { usrId },
      })
      .onConflictDoNothing();

    const events = await db
      .select()
      .from(jobTimelineEvents)
      .where(and(eq(jobTimelineEvents.jobId, jobId), eq(jobTimelineEvents.userId, userId)))
      .orderBy(jobTimelineEvents.timestamp, jobTimelineEvents.sequenceNum);

    req.log.info({ jobId, usrId }, "Job completed, USR ID generated");
    res.json({ job: completedJob, events });
  } catch (err) {
    req.log.error({ err }, "Failed to complete job");
    res.status(500).json({ error: "Failed to complete job" });
  }
});

// ─── GET /jobs/:jobId/service-record — assemble the USS service record ─────────
// Returns the full USS-structured service record assembled from job + all events.
// All sections are always present (never omitted). Missing data uses null/[].
// This is the canonical read endpoint for the Service Record page.

jobsRouter.get("/jobs/:jobId/service-record", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const jobId = String(req.params.jobId);

  try {
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const events = await db
      .select()
      .from(jobTimelineEvents)
      .where(and(eq(jobTimelineEvents.jobId, jobId), eq(jobTimelineEvents.userId, userId)))
      .orderBy(jobTimelineEvents.timestamp, jobTimelineEvents.sequenceNum);

    const record = assembleServiceRecord(job, events);
    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to assemble service record");
    res.status(500).json({ error: "Failed to assemble service record" });
  }
});

// ─── POST /jobs/:jobId/events — append a timeline event ──────────────────────

jobsRouter.post("/jobs/:jobId/events", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const jobId = String(req.params.jobId);
  const parsed = CreateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const [job] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const eventId = parsed.data.id ?? newId("evt");
    const event = {
      id:              eventId,
      jobId,
      userId,
      eventType:       parsed.data.eventType,
      title:           parsed.data.title,
      timestamp:       parsed.data.timestamp ?? Date.now(),
      notes:           parsed.data.notes           ?? null,
      voiceTranscript: parsed.data.voiceTranscript ?? null,
      voiceCorrected:  parsed.data.voiceCorrected  ?? null,
      photoUrls:       parsed.data.photoUrls        ?? null,
      measurements:    parsed.data.measurements     ?? null,
      parts:           parsed.data.parts            ?? null,
      metadata:        parsed.data.metadata         ?? null,
      sequenceNum:     parsed.data.sequenceNum      ?? 0,
    };

    await db.insert(jobTimelineEvents).values(event).onConflictDoNothing();
    const [created] = await db
      .select()
      .from(jobTimelineEvents)
      .where(eq(jobTimelineEvents.id, eventId));

    await db
      .update(jobs)
      .set({ updatedAt: Date.now() })
      .where(eq(jobs.id, jobId));

    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create timeline event");
    res.status(500).json({ error: "Failed to create timeline event" });
  }
});

// ─── PATCH /jobs/:jobId/events/:eventId — edit an event ──────────────────────

jobsRouter.patch(
  "/jobs/:jobId/events/:eventId",
  async (req: Request, res: Response) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const jobId = String(req.params.jobId);
    const eventId = String(req.params.eventId);
    const parsed = UpdateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    try {
      const [existing] = await db
        .select({ id: jobTimelineEvents.id })
        .from(jobTimelineEvents)
        .where(
          and(
            eq(jobTimelineEvents.id, eventId),
            eq(jobTimelineEvents.jobId, jobId),
            eq(jobTimelineEvents.userId, userId),
          ),
        );

      if (!existing) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      const [updated] = await db
        .update(jobTimelineEvents)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(jobTimelineEvents.id, eventId))
        .returning();

      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to update event");
      res.status(500).json({ error: "Failed to update event" });
    }
  },
);

// ─── DELETE /jobs/:jobId/events/:eventId — remove an event ───────────────────

jobsRouter.delete(
  "/jobs/:jobId/events/:eventId",
  async (req: Request, res: Response) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const jobId = String(req.params.jobId);
    const eventId = String(req.params.eventId);

    try {
      const [existing] = await db
        .select({ id: jobTimelineEvents.id })
        .from(jobTimelineEvents)
        .where(
          and(
            eq(jobTimelineEvents.id, eventId),
            eq(jobTimelineEvents.jobId, jobId),
            eq(jobTimelineEvents.userId, userId),
          ),
        );

      if (!existing) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      await db.delete(jobTimelineEvents).where(eq(jobTimelineEvents.id, eventId));
      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to delete event");
      res.status(500).json({ error: "Failed to delete event" });
    }
  },
);

// Suppress unused import warning — usrSequences is used indirectly via sql``
void usrSequences;

export default jobsRouter;
