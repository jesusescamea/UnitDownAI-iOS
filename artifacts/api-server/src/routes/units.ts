import { Router, type Request, type Response } from "express";
import { db, unitRecords } from "@workspace/db";
import { eq, and, desc, or, ilike } from "drizzle-orm";

const unitsRouter = Router();

function validateClientId(clientId: unknown): clientId is string {
  return typeof clientId === "string" && clientId.startsWith("user_") && clientId.length < 200;
}

// GET /api/units?clientId=xxx&q=search&archived=true
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
      .where(
        and(
          eq(unitRecords.userId, clientId),
          eq(unitRecords.isArchived, showArchived),
        )
      )
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

// GET /api/units/:id?clientId=xxx
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

// POST /api/units
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

// PATCH /api/units/:id
unitsRouter.patch("/units/:id", async (req: Request, res: Response) => {
  const { clientId, unit } = req.body ?? {};
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const allowed = [
    "siteCustomerName","nickname","location","manufacturer","modelNumber","serialNumber",
    "equipmentType","systemType","refrigerantType","voltage","phase","mca","mocp","rla",
    "lra","capacityTons","manufactureDate","notes","nameplateImageUrl",
  ];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (unit && key in unit) updates[key] = unit[key] ?? null;
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

// DELETE /api/units/:id  — soft-archive
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

export default unitsRouter;
