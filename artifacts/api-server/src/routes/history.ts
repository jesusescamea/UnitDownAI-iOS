import { Router, type Request, type Response } from "express";
import { db, userDiagnostics } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const historyRouter = Router();

// GET /api/history?clientId=xxx  — returns up to 20 entries newest-first
historyRouter.get("/history", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!clientId || typeof clientId !== "string" || clientId.length > 200) {
    res.status(400).json({ error: "clientId required" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(userDiagnostics)
      .where(eq(userDiagnostics.userId, clientId))
      .orderBy(desc(userDiagnostics.timestamp))
      .limit(20);

    const entries = rows.map((r) => ({
      id: r.id,
      symptoms: r.symptoms,
      result: r.result,
      timestamp: Number(r.timestamp),
    }));

    res.json({ entries });
  } catch (err: any) {
    // 42P01 = relation does not exist (table not yet migrated in this environment)
    if (err?.code === "42P01") {
      res.json({ entries: [] });
      return;
    }
    req.log?.error(err, "Failed to fetch history");
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// POST /api/history  — upsert one or more entries for a user (idempotent by entry id)
historyRouter.post("/history", async (req: Request, res: Response) => {
  const { clientId, entries } = req.body ?? {};

  if (
    typeof clientId !== "string" || clientId.length < 1 || clientId.length > 200 ||
    !Array.isArray(entries) || entries.length === 0 || entries.length > 25
  ) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const rows = entries
    .filter(
      (e) =>
        e &&
        typeof e.id === "string" && e.id.length > 0 &&
        typeof e.symptoms === "string" && e.symptoms.length > 0 &&
        e.result != null &&
        typeof e.timestamp === "number" && e.timestamp > 0
    )
    .map((e) => ({
      id: e.id as string,
      userId: clientId,
      symptoms: (e.symptoms as string).slice(0, 2000),
      result: e.result,
      timestamp: e.timestamp as number,
    }));

  if (rows.length === 0) {
    res.json({ saved: 0 });
    return;
  }

  try {
    await db.insert(userDiagnostics).values(rows).onConflictDoNothing();
    res.json({ saved: rows.length });
  } catch (err: any) {
    // 42P01 = relation does not exist (table not yet migrated in this environment)
    if (err?.code === "42P01") {
      res.json({ saved: 0 });
      return;
    }
    req.log?.error(err, "Failed to save history");
    res.status(500).json({ error: "Failed to save history" });
  }
});

export default historyRouter;
