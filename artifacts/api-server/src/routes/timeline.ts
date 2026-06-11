import { Router, type Request, type Response } from "express";
import { db, equipmentTimeline, diagnosticLogs, unitRecords } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const timelineRouter = Router();

function validateClientId(clientId: unknown): clientId is string {
  return typeof clientId === "string" && clientId.startsWith("user_") && clientId.length < 200;
}

// ─── GET /api/units/:unitId/timeline ─────────────────────────────────────────
// Returns merged timeline: manual entries from equipment_timeline table PLUS
// diagnostic events synthesized from diagnostic_logs. Sorted newest-first.
// Query: clientId (required), type (filter), q (search)
timelineRouter.get("/units/:unitId/timeline", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const unitId = String(req.params.unitId);
  const typeFilter = (req.query.type as string | undefined)?.trim();
  const q = (req.query.q as string | undefined)?.trim().toLowerCase();

  try {
    // Security: verify unit belongs to this user before exposing any data
    const [unit] = await db
      .select({ id: unitRecords.id })
      .from(unitRecords)
      .where(and(eq(unitRecords.id, unitId), eq(unitRecords.userId, clientId)));

    if (!unit) {
      res.status(404).json({ error: "Unit not found" });
      return;
    }

    // Fetch manual timeline entries (repair / note / maintenance / scan)
    const manualRows = await db
      .select()
      .from(equipmentTimeline)
      .where(and(eq(equipmentTimeline.unitId, unitId), eq(equipmentTimeline.userId, clientId)))
      .orderBy(desc(equipmentTimeline.eventDate));

    // Fetch diagnostic logs linked to this unit
    const diagRows = await db
      .select()
      .from(diagnosticLogs)
      .where(and(eq(diagnosticLogs.unitId, unitId), eq(diagnosticLogs.userId, clientId)))
      .orderBy(desc(diagnosticLogs.timestamp));

    // Synthesize diagnostic events from logs (prefix id with "diag_" so client can distinguish)
    const diagEvents = diagRows.map((log) => ({
      id: `diag_${log.id}`,
      unitId,
      eventType: "diagnostic" as const,
      title: log.diagnosisTitle ?? "Diagnosis",
      description: log.symptoms,
      status: log.status,
      technicianNotes: log.technicianNotes,
      cost: null as string | null,
      parts: null as string | null,
      linkedDiagnosticLogId: log.id,
      eventDate: Number(log.timestamp),
      createdAt: log.createdAt.toISOString(),
      confidencePercent: log.confidencePercent,
      source: "log" as const,
    }));

    // Normalize manual rows
    const manualEvents = manualRows.map((entry) => ({
      id: entry.id,
      unitId: entry.unitId,
      eventType: entry.eventType,
      title: entry.title,
      description: entry.description,
      status: entry.status,
      technicianNotes: entry.technicianNotes,
      cost: entry.cost,
      parts: entry.parts,
      linkedDiagnosticLogId: entry.linkedDiagnosticLogId,
      eventDate: Number(entry.eventDate),
      createdAt: entry.createdAt.toISOString(),
      confidencePercent: null as number | null,
      source: "manual" as const,
    }));

    // Merge, sort newest first
    let events = [...manualEvents, ...diagEvents].sort((a, b) => b.eventDate - a.eventDate);

    // Apply type filter
    if (typeFilter && typeFilter !== "all") {
      events = events.filter((e) => e.eventType === typeFilter);
    }

    // Apply search across title, description, technicianNotes
    if (q) {
      events = events.filter((e) =>
        [e.title, e.description, e.technicianNotes].some((f) => f?.toLowerCase().includes(q))
      );
    }

    res.json({ events });
  } catch (err: any) {
    // 42P01 = table does not exist (before first migration)
    if (err?.code === "42P01") { res.json({ events: [] }); return; }
    req.log?.error(err, "Failed to list timeline events");
    res.status(500).json({ error: "Failed to load timeline" });
  }
});

// ─── POST /api/units/:unitId/timeline ────────────────────────────────────────
timelineRouter.post("/units/:unitId/timeline", async (req: Request, res: Response) => {
  const { clientId, event } = req.body ?? {};
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const unitId = String(req.params.unitId);

  if (!event || typeof event !== "object" || typeof event.title !== "string" || !event.title.trim()) {
    res.status(400).json({ error: "event.title is required" });
    return;
  }

  const validTypes = ["repair", "note", "maintenance", "scan"];
  if (!validTypes.includes(event.eventType)) {
    res.status(400).json({ error: "Invalid event type" });
    return;
  }

  try {
    const [unit] = await db
      .select({ id: unitRecords.id })
      .from(unitRecords)
      .where(and(eq(unitRecords.id, unitId), eq(unitRecords.userId, clientId)));

    if (!unit) {
      res.status(404).json({ error: "Unit not found" });
      return;
    }

    const id = `tl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const validStatuses = ["unresolved", "monitoring", "resolved"];

    await db.insert(equipmentTimeline).values({
      id,
      unitId,
      userId: clientId,
      eventType: event.eventType as string,
      title: (event.title as string).slice(0, 500),
      description: typeof event.description === "string" ? event.description.slice(0, 2000) : null,
      status: typeof event.status === "string" && validStatuses.includes(event.status) ? event.status : null,
      technicianNotes: typeof event.technicianNotes === "string" ? event.technicianNotes.slice(0, 4000) : null,
      cost: typeof event.cost === "string" ? event.cost.slice(0, 100) : null,
      parts: typeof event.parts === "string" ? event.parts.slice(0, 1000) : null,
      linkedDiagnosticLogId: typeof event.linkedDiagnosticLogId === "string" ? event.linkedDiagnosticLogId : null,
      eventDate: typeof event.eventDate === "number" ? event.eventDate : Date.now(),
    });

    const [created] = await db.select().from(equipmentTimeline).where(eq(equipmentTimeline.id, id));

    res.status(201).json({
      event: {
        ...created,
        eventDate: Number(created!.eventDate),
        createdAt: created!.createdAt.toISOString(),
        confidencePercent: null,
        source: "manual",
      },
    });
  } catch (err: any) {
    req.log?.error(err, "Failed to create timeline event");
    res.status(500).json({ error: "Failed to create timeline event" });
  }
});

// ─── PATCH /api/timeline/:id ──────────────────────────────────────────────────
timelineRouter.patch("/timeline/:id", async (req: Request, res: Response) => {
  const { clientId, ...fields } = req.body ?? {};
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const entryId = String(req.params.id);
  const validStatuses = ["unresolved", "monitoring", "resolved"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof fields.title === "string" && fields.title.trim()) updates.title = fields.title.slice(0, 500);
  if (typeof fields.description === "string") updates.description = fields.description.slice(0, 2000);
  if (typeof fields.technicianNotes === "string") updates.technicianNotes = fields.technicianNotes.slice(0, 4000);
  if (typeof fields.cost === "string") updates.cost = fields.cost.slice(0, 100);
  if (typeof fields.parts === "string") updates.parts = fields.parts.slice(0, 1000);
  if (typeof fields.status === "string" && validStatuses.includes(fields.status)) updates.status = fields.status;

  try {
    const [existing] = await db
      .select()
      .from(equipmentTimeline)
      .where(and(eq(equipmentTimeline.id, entryId), eq(equipmentTimeline.userId, clientId)));

    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }

    await db
      .update(equipmentTimeline)
      .set(updates as Partial<typeof equipmentTimeline.$inferInsert>)
      .where(and(eq(equipmentTimeline.id, entryId), eq(equipmentTimeline.userId, clientId)));

    const [updated] = await db.select().from(equipmentTimeline).where(eq(equipmentTimeline.id, entryId));
    res.json({
      event: {
        ...updated,
        eventDate: Number(updated!.eventDate),
        createdAt: updated!.createdAt.toISOString(),
        confidencePercent: null,
        source: "manual",
      },
    });
  } catch (err: any) {
    req.log?.error(err, "Failed to update timeline event");
    res.status(500).json({ error: "Failed to update timeline event" });
  }
});

// ─── DELETE /api/timeline/:id?clientId= ──────────────────────────────────────
timelineRouter.delete("/timeline/:id", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const entryId = String(req.params.id);

  try {
    const [existing] = await db
      .select()
      .from(equipmentTimeline)
      .where(and(eq(equipmentTimeline.id, entryId), eq(equipmentTimeline.userId, clientId)));

    if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }

    await db
      .delete(equipmentTimeline)
      .where(and(eq(equipmentTimeline.id, entryId), eq(equipmentTimeline.userId, clientId)));

    res.json({ ok: true });
  } catch (err: any) {
    req.log?.error(err, "Failed to delete timeline event");
    res.status(500).json({ error: "Failed to delete timeline event" });
  }
});

export default timelineRouter;
