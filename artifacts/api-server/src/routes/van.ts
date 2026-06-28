import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { vanInventory, toolChecklist } from "@workspace/db";

const vanRouter = Router();

// ─── Auth helper (clientId from query/body, consistent with units.ts pattern) ──

function getClientId(req: Request): string | null {
  const id = (req.query.clientId as string | undefined) ?? (req.body?.clientId as string | undefined);
  if (typeof id !== "string" || !id.startsWith("user_") || id.length > 200) return null;
  return id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Van Inventory
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/van/inventory — list all active items for the user ───────────────
vanRouter.get("/van/inventory", async (req: Request, res: Response) => {
  const userId = getClientId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const items = await db
      .select()
      .from(vanInventory)
      .where(and(eq(vanInventory.userId, userId), eq(vanInventory.isActive, true)));
    res.json({ items });
  } catch (err) {
    req.log.error({ err }, "Failed to list van inventory");
    res.status(500).json({ error: "Failed to list van inventory" });
  }
});

// ─── POST /api/van/inventory/bulk — seed default inventory if empty ────────────
vanRouter.post("/van/inventory/bulk", async (req: Request, res: Response) => {
  const userId = getClientId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { items } = req.body as {
    items?: Array<{
      id: string;
      itemName: string;
      category: string;
      qty: number;
      minQty: number;
      unit: string;
    }>;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items array required" });
    return;
  }

  try {
    // Check if user already has inventory — don't re-seed if so
    const existing = await db
      .select({ id: vanInventory.id })
      .from(vanInventory)
      .where(and(eq(vanInventory.userId, userId), eq(vanInventory.isActive, true)))
      .limit(1);

    if (existing.length > 0) {
      res.json({ skipped: true, reason: "Inventory already exists" });
      return;
    }

    const now = new Date();
    const rows = items.map((item) => ({
      id: item.id,
      userId,
      itemName: item.itemName,
      category: item.category,
      qty: item.qty,
      minQty: item.minQty,
      unit: item.unit,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(vanInventory).values(rows).onConflictDoNothing();
    res.json({ seeded: rows.length });
  } catch (err) {
    req.log.error({ err }, "Failed to seed van inventory");
    res.status(500).json({ error: "Failed to seed van inventory" });
  }
});

// ─── PATCH /api/van/inventory/:id — update qty for one item ───────────────────
vanRouter.patch("/van/inventory/:id", async (req: Request, res: Response) => {
  const userId = getClientId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { id } = req.params as { id: string };
  const { qty } = req.body as { qty?: unknown };

  if (typeof qty !== "number" || !Number.isFinite(qty) || qty < 0) {
    res.status(400).json({ error: "qty must be a non-negative finite number" });
    return;
  }

  try {
    await db
      .update(vanInventory)
      .set({ qty: Math.floor(qty), updatedAt: new Date() })
      .where(and(eq(vanInventory.id, id), eq(vanInventory.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update van inventory item");
    res.status(500).json({ error: "Failed to update van inventory item" });
  }
});

// ─── DELETE /api/van/inventory/:id — soft-delete (deactivate) ─────────────────
vanRouter.delete("/van/inventory/:id", async (req: Request, res: Response) => {
  const userId = getClientId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { id } = req.params as { id: string };

  try {
    await db
      .update(vanInventory)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(vanInventory.id, id), eq(vanInventory.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to deactivate van inventory item");
    res.status(500).json({ error: "Failed to deactivate van inventory item" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tool Checklist
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/van/tools — list all tools for the user ─────────────────────────
vanRouter.get("/van/tools", async (req: Request, res: Response) => {
  const userId = getClientId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const items = await db
      .select()
      .from(toolChecklist)
      .where(eq(toolChecklist.userId, userId));
    res.json({ items });
  } catch (err) {
    req.log.error({ err }, "Failed to list tool checklist");
    res.status(500).json({ error: "Failed to list tool checklist" });
  }
});

// ─── POST /api/van/tools/bulk — seed default tools if empty ───────────────────
vanRouter.post("/van/tools/bulk", async (req: Request, res: Response) => {
  const userId = getClientId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { items } = req.body as {
    items?: Array<{
      id: string;
      toolName: string;
      category: string;
      hasItem: boolean;
    }>;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items array required" });
    return;
  }

  try {
    const existing = await db
      .select({ id: toolChecklist.id })
      .from(toolChecklist)
      .where(eq(toolChecklist.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      res.json({ skipped: true, reason: "Tool checklist already exists" });
      return;
    }

    const now = new Date();
    const rows = items.map((item) => ({
      id: item.id,
      userId,
      toolName: item.toolName,
      category: item.category,
      hasItem: item.hasItem,
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(toolChecklist).values(rows).onConflictDoNothing();
    res.json({ seeded: rows.length });
  } catch (err) {
    req.log.error({ err }, "Failed to seed tool checklist");
    res.status(500).json({ error: "Failed to seed tool checklist" });
  }
});

// ─── PATCH /api/van/tools/:id — update hasItem for one tool ───────────────────
vanRouter.patch("/van/tools/:id", async (req: Request, res: Response) => {
  const userId = getClientId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { id } = req.params as { id: string };
  const { hasItem } = req.body as { hasItem?: unknown };

  if (typeof hasItem !== "boolean") {
    res.status(400).json({ error: "hasItem must be a boolean" });
    return;
  }

  try {
    await db
      .update(toolChecklist)
      .set({ hasItem, updatedAt: new Date() })
      .where(and(eq(toolChecklist.id, id), eq(toolChecklist.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update tool checklist item");
    res.status(500).json({ error: "Failed to update tool checklist item" });
  }
});

export default vanRouter;
