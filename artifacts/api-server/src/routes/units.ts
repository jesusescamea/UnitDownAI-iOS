import { Router, type Request, type Response } from "express";
import { db, unitRecords, jobs, jobTimelineEvents } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const unitsRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateClientId(clientId: unknown): clientId is string {
  return typeof clientId === "string" && clientId.startsWith("user_") && clientId.length < 200;
}

/**
 * Normalizes a serial/model/text for duplicate matching:
 * uppercase → remove spaces, dashes, periods, and any non-alphanumeric characters.
 * "5613-E03278", "5613 E03278", "5613E03278" all → "5613E03278"
 */
function normalizeSerial(s: string | null | undefined): string {
  if (!s) return "";
  return s.toUpperCase().replace(/[\s\-\.]/g, "").replace(/[^A-Z0-9]/g, "");
}

/**
 * Normalizes text fields for loose comparison:
 * uppercase, collapse internal spaces, remove leading/trailing whitespace.
 */
function normalizeText(s: string | null | undefined): string {
  if (!s) return "";
  return s.toUpperCase().trim().replace(/\s+/g, " ");
}

// ─── GET /api/units ───────────────────────────────────────────────────────────

unitsRouter.get("/units", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const q = (req.query.q as string | undefined)?.trim();
  const showArchived = req.query.archived === "true";

  try {
    const rows = await db
      .select()
      .from(unitRecords)
      .where(and(eq(unitRecords.userId, clientId), eq(unitRecords.isArchived, showArchived)))
      .orderBy(desc(unitRecords.updatedAt));

    let filtered = rows;
    if (q) {
      const lower = q.toLowerCase();
      filtered = rows.filter((r) =>
        [r.nickname, r.siteCustomerName, r.location, r.manufacturer, r.modelNumber, r.serialNumber, r.equipmentType]
          .some((f) => f?.toLowerCase().includes(lower))
      );
    }

    res.json({ units: filtered });
  } catch (err: any) {
    if (err?.code === "42P01") { res.json({ units: [] }); return; }
    req.log?.error(err, "Failed to list units");
    res.status(500).json({ error: "Failed to list units" });
  }
});

// ─── GET /api/units/:id ───────────────────────────────────────────────────────

unitsRouter.get("/units/:id", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const unitId = String(req.params.id);
    const [row] = await db
      .select()
      .from(unitRecords)
      .where(and(eq(unitRecords.id, unitId), eq(unitRecords.userId, clientId)));

    if (!row) { res.status(404).json({ error: "Unit not found" }); return; }
    res.json({ unit: row });
  } catch (err: any) {
    if (err?.code === "42P01") { res.status(404).json({ error: "Unit not found" }); return; }
    req.log?.error(err, "Failed to get unit");
    res.status(500).json({ error: "Failed to get unit" });
  }
});

// ─── POST /api/units/check-duplicate ─────────────────────────────────────────
// Checks for potential duplicate units before saving.
// Returns a prioritized list of matches:
//   Priority 1 — Definite Duplicate: exact (raw, case-insensitive) serial match
//   Priority 2 — High Confidence:    normalized serial + mfg + model all match
//   Priority 3 — Possible Duplicate: same site + mfg + model (serial may differ)
//
// Pass excludeId when editing an existing unit to exclude it from results.

unitsRouter.post("/units/check-duplicate", async (req: Request, res: Response) => {
  const { clientId, unit, excludeId } = req.body ?? {};
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!unit || typeof unit !== "object") {
    res.status(400).json({ error: "unit object required" });
    return;
  }

  // Incoming values
  const inSerialRaw = ((unit.serialNumber as string) ?? "").toUpperCase().trim();
  const inSerialNorm = normalizeSerial(unit.serialNumber as string);
  const inMfg = normalizeText(unit.manufacturer as string);
  const inModel = normalizeText(unit.modelNumber as string);
  const inSite = normalizeText(unit.siteCustomerName as string);

  try {
    const allUnits = await db
      .select()
      .from(unitRecords)
      .where(and(eq(unitRecords.userId, clientId), eq(unitRecords.isArchived, false)));

    const candidates = typeof excludeId === "string"
      ? allUnits.filter((u) => u.id !== excludeId)
      : allUnits;

    type Priority = 1 | 2 | 3;
    interface DuplicateResult { priority: Priority; unit: typeof candidates[0] }
    const seen = new Set<string>();
    const duplicates: DuplicateResult[] = [];

    for (const c of candidates) {
      const cSerialRaw = (c.serialNumber ?? "").toUpperCase().trim();
      const cSerialNorm = normalizeSerial(c.serialNumber);
      const cMfg = normalizeText(c.manufacturer);
      const cModel = normalizeText(c.modelNumber);
      const cSite = normalizeText(c.siteCustomerName);

      let priority: Priority | null = null;

      // P1: Exact (raw, case-insensitive) serial match
      if (inSerialRaw && cSerialRaw && inSerialRaw === cSerialRaw) {
        priority = 1;
      }
      // P2: Normalized serial + mfg + model all match
      // (catches "5613-E03278" vs "5613E03278" when all three fields are verified)
      else if (
        inSerialNorm && cSerialNorm && inSerialNorm === cSerialNorm &&
        inMfg && cMfg && inMfg === cMfg &&
        inModel && cModel && inModel === cModel
      ) {
        priority = 2;
      }
      // P3: Same site + mfg + model (serial may be different or empty)
      // Triggers when technicians accidentally scan the same RTU model twice at the same site
      else if (
        inSite && cSite && inSite === cSite &&
        inMfg && cMfg && inMfg === cMfg &&
        inModel && cModel && inModel === cModel
      ) {
        priority = 3;
      }

      if (priority !== null && !seen.has(c.id)) {
        seen.add(c.id);
        duplicates.push({ priority, unit: c });
      }
    }

    // Sort by priority ascending (P1 = most alarming, shown first)
    duplicates.sort((a, b) => a.priority - b.priority);

    if (duplicates.length > 0) {
      req.log?.info(
        {
          count: duplicates.length,
          priorities: duplicates.map((d) => d.priority),
          topSerial: duplicates[0]?.unit.serialNumber,
        },
        "Duplicate unit detection triggered",
      );
    }

    res.json({ duplicates });
  } catch (err: any) {
    if (err?.code === "42P01") { res.json({ duplicates: [] }); return; }
    req.log?.error(err, "Duplicate check failed");
    res.status(500).json({ error: "Duplicate check failed" });
  }
});

// ─── POST /api/units ──────────────────────────────────────────────────────────

unitsRouter.post("/units", async (req: Request, res: Response) => {
  const { clientId, unit } = req.body ?? {};
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!unit || typeof unit !== "object") {
    res.status(400).json({ error: "unit object required" });
    return;
  }

  const id = `unit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const row = {
    id,
    userId: clientId,
    siteCustomerName: unit.siteCustomerName ?? null,
    nickname: unit.nickname ?? null,
    location: unit.location ?? null,
    manufacturer: unit.manufacturer ?? null,
    modelNumber: unit.modelNumber ?? null,
    serialNumber: unit.serialNumber ?? null,
    serialNumberNormalized: normalizeSerial(unit.serialNumber) || null,
    equipmentType: unit.equipmentType ?? null,
    systemType: unit.systemType ?? null,
    refrigerantType: unit.refrigerantType ?? null,
    voltage: unit.voltage ?? null,
    phase: unit.phase ?? null,
    mca: unit.mca ?? null,
    mocp: unit.mocp ?? null,
    rla: unit.rla ?? null,
    lra: unit.lra ?? null,
    capacityTons: unit.capacityTons ?? null,
    manufactureDate: unit.manufactureDate ?? null,
    notes: unit.notes ?? null,
    nameplateImageUrl: unit.nameplateImageUrl ?? null,
    nameplatePreviewUrl: unit.nameplatePreviewUrl ?? null,
    isFavorite: typeof unit.isFavorite === "boolean" ? unit.isFavorite : false,
  };

  try {
    await db.insert(unitRecords).values(row);
    const [created] = await db.select().from(unitRecords).where(eq(unitRecords.id, id));
    res.status(201).json({ unit: created });
  } catch (err: any) {
    req.log?.error(err, "Failed to create unit");
    res.status(500).json({ error: "Failed to create unit" });
  }
});

// ─── PATCH /api/units/:id ─────────────────────────────────────────────────────

unitsRouter.patch("/units/:id", async (req: Request, res: Response) => {
  const { clientId, unit } = req.body ?? {};
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const allowed = [
    "siteCustomerName","nickname","location","manufacturer","modelNumber","serialNumber",
    "equipmentType","systemType","refrigerantType","voltage","phase","mca","mocp","rla",
    "lra","capacityTons","manufactureDate","notes","nameplateImageUrl","nameplatePreviewUrl",
    "isFavorite",
  ];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (unit && key in unit) updates[key] = unit[key] ?? null;
  }
  // Keep serialNumberNormalized in sync whenever serialNumber changes
  if ("serialNumber" in (unit ?? {})) {
    updates.serialNumberNormalized = normalizeSerial(unit.serialNumber) || null;
  }

  try {
    const unitId = String(req.params.id);
    const [existing] = await db
      .select()
      .from(unitRecords)
      .where(and(eq(unitRecords.id, unitId), eq(unitRecords.userId, clientId)));
    if (!existing) { res.status(404).json({ error: "Unit not found" }); return; }

    await db
      .update(unitRecords)
      .set(updates as Partial<typeof unitRecords.$inferInsert>)
      .where(and(eq(unitRecords.id, unitId), eq(unitRecords.userId, clientId)));

    const [updated] = await db.select().from(unitRecords).where(eq(unitRecords.id, unitId));
    res.json({ unit: updated });
  } catch (err: any) {
    req.log?.error(err, "Failed to update unit");
    res.status(500).json({ error: "Failed to update unit" });
  }
});

// ─── DELETE /api/units/:id — soft-archive ─────────────────────────────────────

unitsRouter.delete("/units/:id", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const unitId = String(req.params.id);
    const [existing] = await db
      .select()
      .from(unitRecords)
      .where(and(eq(unitRecords.id, unitId), eq(unitRecords.userId, clientId)));
    if (!existing) { res.status(404).json({ error: "Unit not found" }); return; }

    await db
      .update(unitRecords)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(unitRecords.id, unitId), eq(unitRecords.userId, clientId)));

    res.json({ ok: true });
  } catch (err: any) {
    req.log?.error(err, "Failed to archive unit");
    res.status(500).json({ error: "Failed to archive unit" });
  }
});

// ─── GET /api/units/:id/memory — cross-job pattern analysis for a unit ─────────
// Queries all job_timeline_events linked to this unit across every completed job
// and synthesizes: repeated parts, chronic alarms, and accumulated memory facts.
unitsRouter.get("/units/:id/memory", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const unitId = String(req.params.id);

  try {
    const events = await db
      .select({
        eventType: jobTimelineEvents.eventType,
        parts:     jobTimelineEvents.parts,
        metadata:  jobTimelineEvents.metadata,
        notes:     jobTimelineEvents.notes,
        timestamp: jobTimelineEvents.timestamp,
        jobId:     jobTimelineEvents.jobId,
      })
      .from(jobTimelineEvents)
      .innerJoin(
        jobs,
        and(
          eq(jobTimelineEvents.jobId, jobs.id),
          eq(jobs.unitId, unitId),
          eq(jobs.userId, clientId),
        ),
      )
      .orderBy(desc(jobTimelineEvents.timestamp));

    const jobIds = new Set(events.map((e) => e.jobId));

    // ── Pattern: repeated parts across multiple jobs ───────────────────────────
    const partMap: Record<string, { name: string; totalQty: number; jobIds: Set<string> }> = {};
    for (const ev of events) {
      const parts = ev.parts as Array<{ name?: string; qty?: number }> | null;
      if (!Array.isArray(parts)) continue;
      for (const p of parts) {
        const name = (p.name ?? "Unknown part").trim();
        if (!partMap[name]) partMap[name] = { name, totalQty: 0, jobIds: new Set() };
        partMap[name].totalQty += typeof p.qty === "number" ? p.qty : 1;
        partMap[name].jobIds.add(ev.jobId);
      }
    }
    const repeatedParts = Object.values(partMap)
      .filter((p) => p.jobIds.size >= 2)
      .map((p) => ({ name: p.name, totalQty: p.totalQty, jobCount: p.jobIds.size }))
      .sort((a, b) => b.jobCount - a.jobCount);

    // ── Pattern: memory facts extracted from job metadata ─────────────────────
    // Later jobs override earlier ones for the same key (most recent is truth).
    const memoryMap: Record<string, string> = {};
    for (const ev of [...events].reverse()) {
      const meta = ev.metadata as Record<string, unknown> | null;
      if (!meta) continue;
      const extracts = meta["memoryExtracts"];
      if (extracts && typeof extracts === "object" && !Array.isArray(extracts)) {
        for (const [k, v] of Object.entries(extracts as Record<string, unknown>)) {
          if (typeof v === "string") memoryMap[k] = v;
        }
      }
    }
    const memoryFacts = Object.entries(memoryMap).map(([key, value]) => `${key}: ${value}`);

    // ── Pattern: chronic alarm codes ──────────────────────────────────────────
    const alarmCounts: Record<string, number> = {};
    for (const ev of events) {
      if (ev.eventType !== "alarm") continue;
      const meta = ev.metadata as Record<string, unknown> | null;
      const code = meta?.["alarmCode"];
      if (typeof code === "string" && code) {
        alarmCounts[code] = (alarmCounts[code] ?? 0) + 1;
      }
    }
    const chronicAlarms = Object.entries(alarmCounts)
      .filter(([, count]) => count >= 2)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      unitId,
      jobCount: jobIds.size,
      eventCount: events.length,
      repeatedParts,
      memoryFacts,
      chronicAlarms,
    });
  } catch (err) {
    req.log?.error(err, "Failed to build memory insights");
    res.status(500).json({ error: "Failed to build memory insights" });
  }
});

export default unitsRouter;
