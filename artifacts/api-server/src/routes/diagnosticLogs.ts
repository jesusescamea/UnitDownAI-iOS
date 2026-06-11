import { Router, type Request, type Response } from "express";
import { db, diagnosticLogs } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const diagnosticLogsRouter = Router();

function validateClientId(clientId: unknown): clientId is string {
  return typeof clientId === "string" && clientId.startsWith("user_") && clientId.length < 200;
}

// GET /api/diagnostic-logs?clientId=xxx&unitId=xxx&q=search
diagnosticLogsRouter.get("/diagnostic-logs", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const unitId = req.query.unitId as string | undefined;
  const q = (req.query.q as string | undefined)?.trim().toLowerCase();

  try {
    const rows = await db
      .select()
      .from(diagnosticLogs)
      .where(
        unitId
          ? and(eq(diagnosticLogs.userId, clientId), eq(diagnosticLogs.unitId, unitId))
          : eq(diagnosticLogs.userId, clientId)
      )
      .orderBy(desc(diagnosticLogs.timestamp))
      .limit(200);

    let filtered = rows;
    if (q) {
      filtered = rows.filter((r) =>
        [r.symptoms, r.diagnosisTitle, r.technicianNotes]
          .some((f) => f?.toLowerCase().includes(q))
      );
    }

    res.json({ logs: filtered });
  } catch (err: any) {
    if (err?.code === "42P01") { res.json({ logs: [] }); return; }
    req.log?.error(err, "Failed to list diagnostic logs");
    res.status(500).json({ error: "Failed to list diagnostic logs" });
  }
});

// GET /api/diagnostic-logs/:id?clientId=xxx
diagnosticLogsRouter.get("/diagnostic-logs/:id", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const logId = String(req.params.id);
    const [row] = await db
      .select()
      .from(diagnosticLogs)
      .where(and(eq(diagnosticLogs.id, logId), eq(diagnosticLogs.userId, clientId)));

    if (!row) { res.status(404).json({ error: "Log not found" }); return; }
    res.json({ log: row });
  } catch (err: any) {
    if (err?.code === "42P01") { res.status(404).json({ error: "Log not found" }); return; }
    req.log?.error(err, "Failed to get diagnostic log");
    res.status(500).json({ error: "Failed to get diagnostic log" });
  }
});

// POST /api/diagnostic-logs  — create a new log entry
diagnosticLogsRouter.post("/diagnostic-logs", async (req: Request, res: Response) => {
  const { clientId, log } = req.body ?? {};
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!log || typeof log !== "object" || typeof log.symptoms !== "string") {
    res.status(400).json({ error: "log.symptoms required" });
    return;
  }

  const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const row = {
    id,
    userId: clientId,
    unitId: typeof log.unitId === "string" ? log.unitId : null,
    symptoms: (log.symptoms as string).slice(0, 4000),
    diagnosisId: typeof log.diagnosisId === "string" ? log.diagnosisId : null,
    diagnosisTitle: typeof log.diagnosisTitle === "string" ? log.diagnosisTitle : null,
    confidencePercent: typeof log.confidencePercent === "number" ? log.confidencePercent : null,
    result: log.result ?? null,
    technicianNotes: typeof log.technicianNotes === "string" ? log.technicianNotes.slice(0, 4000) : null,
    status: (typeof log.status === "string" && ["unresolved","monitoring","resolved"].includes(log.status))
      ? log.status : "unresolved",
    resolutionNotes: typeof log.resolutionNotes === "string" ? log.resolutionNotes.slice(0, 4000) : null,
    timestamp: typeof log.timestamp === "number" ? log.timestamp : Date.now(),
  };

  try {
    await db.insert(diagnosticLogs).values(row);
    const [created] = await db.select().from(diagnosticLogs).where(eq(diagnosticLogs.id, id));
    res.status(201).json({ log: created });
  } catch (err: any) {
    req.log?.error(err, "Failed to create diagnostic log");
    res.status(500).json({ error: "Failed to create diagnostic log" });
  }
});

// PATCH /api/diagnostic-logs/:id  — update notes / status / resolution / unitId
diagnosticLogsRouter.patch("/diagnostic-logs/:id", async (req: Request, res: Response) => {
  const { clientId, ...fields } = req.body ?? {};
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof fields.technicianNotes === "string") updates.technicianNotes = fields.technicianNotes.slice(0, 4000);
  if (typeof fields.resolutionNotes === "string") updates.resolutionNotes = fields.resolutionNotes.slice(0, 4000);
  if (typeof fields.status === "string" && ["unresolved","monitoring","resolved"].includes(fields.status)) {
    updates.status = fields.status;
  }
  if (typeof fields.unitId === "string" || fields.unitId === null) updates.unitId = fields.unitId;

  try {
    const logId = String(req.params.id);
    const [existing] = await db
      .select()
      .from(diagnosticLogs)
      .where(and(eq(diagnosticLogs.id, logId), eq(diagnosticLogs.userId, clientId)));
    if (!existing) { res.status(404).json({ error: "Log not found" }); return; }

    await db
      .update(diagnosticLogs)
      .set(updates as Partial<typeof diagnosticLogs.$inferInsert>)
      .where(and(eq(diagnosticLogs.id, logId), eq(diagnosticLogs.userId, clientId)));

    const [updated] = await db.select().from(diagnosticLogs).where(eq(diagnosticLogs.id, logId));
    res.json({ log: updated });
  } catch (err: any) {
    req.log?.error(err, "Failed to update diagnostic log");
    res.status(500).json({ error: "Failed to update diagnostic log" });
  }
});

export default diagnosticLogsRouter;
