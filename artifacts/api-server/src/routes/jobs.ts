import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { jobs, jobTimelineEvents } from "@workspace/db";

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

// ─── Validation schemas ───────────────────────────────────────────────────────

const CreateJobSchema = z.object({
  // Client-provided ID for offline-first job creation (idempotency).
  // If omitted, the server generates one.
  id:        z.string().optional(),
  unitId:    z.string().optional(),
  customer:  z.string().optional(),
  site:      z.string().optional(),
  unitLabel: z.string().optional(),
  title:     z.string().optional(),
});

const UpdateJobSchema = z.object({
  status:      z.enum(["active", "paused", "completed", "cancelled"]).optional(),
  title:       z.string().optional(),
  unitId:      z.string().optional(),
  customer:    z.string().optional(),
  site:        z.string().optional(),
  unitLabel:   z.string().optional(),
  completedAt: z.number().optional(),
  metadata:    z.record(z.string(), z.unknown()).optional(),
});

const CreateEventSchema = z.object({
  // Client-provided ID for idempotency (offline sync deduplication).
  // If omitted, the server generates one.
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
    metadata:    null,
  };

  try {
    // onConflictDoNothing: if the client retries after a network failure, the
    // second call is silently ignored and we return the already-created row.
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

    // onConflictDoNothing: idempotent for offline sync retries.
    // If the client sends the same event twice, the second insert is silently
    // ignored and we return the already-persisted row.
    await db.insert(jobTimelineEvents).values(event).onConflictDoNothing();
    const [created] = await db
      .select()
      .from(jobTimelineEvents)
      .where(eq(jobTimelineEvents.id, eventId));

    // Touch the parent job's updatedAt so resume detection works correctly
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

export default jobsRouter;
