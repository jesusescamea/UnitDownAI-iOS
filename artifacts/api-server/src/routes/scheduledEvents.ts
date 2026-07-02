import { Router, type Request, type Response } from "express";
import { db, scheduledEvents } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";

import { conditionalClerkMiddleware, clientIdAuthMiddleware, requireClientId } from "../lib/serverAuth";

const scheduledEventsRouter = Router();
scheduledEventsRouter.use(conditionalClerkMiddleware(), clientIdAuthMiddleware());

// GET /api/scheduled-events?clientId=xxx&upcoming=true&unitId=xxx
scheduledEventsRouter.get("/scheduled-events", async (req: Request, res: Response) => {
  const clientId = requireClientId(req, res);
  if (!clientId) return;

  const upcomingOnly = req.query.upcoming === "true";
  const unitId = req.query.unitId as string | undefined;

  try {
    let whereClause;
    if (unitId && upcomingOnly) {
      whereClause = and(
        eq(scheduledEvents.userId, clientId),
        eq(scheduledEvents.isCompleted, false),
        eq(scheduledEvents.unitId, unitId),
      );
    } else if (unitId) {
      whereClause = and(eq(scheduledEvents.userId, clientId), eq(scheduledEvents.unitId, unitId));
    } else if (upcomingOnly) {
      whereClause = and(eq(scheduledEvents.userId, clientId), eq(scheduledEvents.isCompleted, false));
    } else {
      whereClause = eq(scheduledEvents.userId, clientId);
    }

    const rows = await db
      .select()
      .from(scheduledEvents)
      .where(whereClause)
      .orderBy(upcomingOnly ? asc(scheduledEvents.scheduledDate) : desc(scheduledEvents.scheduledDate))
      .limit(100);

    res.json({ events: rows });
  } catch (err: any) {
    if (err?.code === "42P01") { res.json({ events: [] }); return; }
    req.log?.error(err, "Failed to list scheduled events");
    res.status(500).json({ error: "Failed to list scheduled events" });
  }
});

// POST /api/scheduled-events
scheduledEventsRouter.post("/scheduled-events", async (req: Request, res: Response) => {
  const { clientId: _bClientId, event } = req.body ?? {};
  const clientId = requireClientId(req, res);
  if (!clientId) return;
  if (!event || typeof event.title !== "string" || !event.title.trim()) {
    res.status(400).json({ error: "event.title required" });
    return;
  }
  if (typeof event.scheduledDate !== "number") {
    res.status(400).json({ error: "event.scheduledDate (unix ms) required" });
    return;
  }

  const id = `sev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const row = {
    id,
    userId: clientId,
    unitId: typeof event.unitId === "string" ? event.unitId : null,
    title: event.title.trim().slice(0, 500),
    eventType: typeof event.eventType === "string" ? event.eventType : "reminder",
    scheduledDate: event.scheduledDate as number,
    isCompleted: false,
    notes: typeof event.notes === "string" ? event.notes.slice(0, 2000) : null,
    recurrence: typeof event.recurrence === "string" && event.recurrence ? event.recurrence : null,
  };

  try {
    await db.insert(scheduledEvents).values(row);
    const [created] = await db.select().from(scheduledEvents).where(eq(scheduledEvents.id, id));
    res.status(201).json({ event: created });
  } catch (err: any) {
    req.log?.error(err, "Failed to create scheduled event");
    res.status(500).json({ error: "Failed to create scheduled event" });
  }
});

// PATCH /api/scheduled-events/:id
scheduledEventsRouter.patch("/scheduled-events/:id", async (req: Request, res: Response) => {
  const { clientId: _bClientId2, ...fields } = req.body ?? {};
  const clientId = requireClientId(req, res);
  if (!clientId) return;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof fields.title === "string") updates.title = fields.title.trim().slice(0, 500);
  if (typeof fields.isCompleted === "boolean") updates.isCompleted = fields.isCompleted;
  if (typeof fields.notes === "string") updates.notes = fields.notes.slice(0, 2000);
  if (typeof fields.scheduledDate === "number") updates.scheduledDate = fields.scheduledDate;
  if (typeof fields.recurrence === "string") updates.recurrence = fields.recurrence || null;
  if (typeof fields.eventType === "string") updates.eventType = fields.eventType;

  try {
    const eventId = String(req.params.id);
    const [existing] = await db
      .select()
      .from(scheduledEvents)
      .where(and(eq(scheduledEvents.id, eventId), eq(scheduledEvents.userId, clientId)));
    if (!existing) { res.status(404).json({ error: "Event not found" }); return; }

    await db
      .update(scheduledEvents)
      .set(updates as Partial<typeof scheduledEvents.$inferInsert>)
      .where(and(eq(scheduledEvents.id, eventId), eq(scheduledEvents.userId, clientId)));

    const [updated] = await db.select().from(scheduledEvents).where(eq(scheduledEvents.id, eventId));
    res.json({ event: updated });
  } catch (err: any) {
    req.log?.error(err, "Failed to update scheduled event");
    res.status(500).json({ error: "Failed to update scheduled event" });
  }
});

// DELETE /api/scheduled-events/:id?clientId=xxx
scheduledEventsRouter.delete("/scheduled-events/:id", async (req: Request, res: Response) => {
  const clientId = requireClientId(req, res);
  if (!clientId) return;

  try {
    const eventId = String(req.params.id);
    const [existing] = await db
      .select()
      .from(scheduledEvents)
      .where(and(eq(scheduledEvents.id, eventId), eq(scheduledEvents.userId, clientId)));
    if (!existing) { res.status(404).json({ error: "Event not found" }); return; }

    await db
      .delete(scheduledEvents)
      .where(and(eq(scheduledEvents.id, eventId), eq(scheduledEvents.userId, clientId)));

    res.json({ ok: true });
  } catch (err: any) {
    req.log?.error(err, "Failed to delete scheduled event");
    res.status(500).json({ error: "Failed to delete scheduled event" });
  }
});

export default scheduledEventsRouter;
