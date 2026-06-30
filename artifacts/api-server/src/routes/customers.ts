/**
 * Customers API
 *
 * GET  /api/customers                — list/search customers
 * GET  /api/customers/:id            — detail with sites + linked units + recent jobs
 * POST /api/customers                — create customer
 * PATCH /api/customers/:id           — update customer
 * DELETE /api/customers/:id          — archive (soft delete)
 *
 * POST  /api/customers/:id/sites     — add site to customer
 * PATCH /api/customer-sites/:siteId  — update site
 * DELETE /api/customer-sites/:siteId — archive site
 *
 * PATCH /api/units/:unitId/link-customer — link a unit to a customer/site
 */

import { Router, type Request, type Response } from "express";
import {
  db,
  customers,
  customerSites,
  unitRecords,
  jobs,
} from "@workspace/db";
import {
  eq,
  and,
  or,
  ilike,
  desc,
  isNull,
} from "drizzle-orm";
import { z } from "zod/v4";

const customersRouter = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────

function validateClientId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("user_") && id.length < 200;
}

function uid(): string {
  return `cust_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function siteUid(): string {
  return `site_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const CustomerBodySchema = z.object({
  clientId:     z.string(),
  name:         z.string().min(1).max(200),
  contactName:  z.string().max(200).optional().nullable(),
  phone:        z.string().max(50).optional().nullable(),
  email:        z.string().max(200).optional().nullable(),
  billingNotes: z.string().max(2000).optional().nullable(),
  notes:        z.string().max(2000).optional().nullable(),
});

const SiteBodySchema = z.object({
  clientId:        z.string(),
  siteName:        z.string().min(1).max(200),
  address:         z.string().max(500).optional().nullable(),
  city:            z.string().max(100).optional().nullable(),
  state:           z.string().max(50).optional().nullable(),
  zip:             z.string().max(20).optional().nullable(),
  accessNotes:     z.string().max(2000).optional().nullable(),
  roofAccessNotes: z.string().max(2000).optional().nullable(),
  gateCode:        z.string().max(200).optional().nullable(),
  parkingNotes:    z.string().max(2000).optional().nullable(),
  mainContact:     z.string().max(200).optional().nullable(),
  siteNotes:       z.string().max(2000).optional().nullable(),
});

// ─── GET /api/customers ───────────────────────────────────────────────────────

customersRouter.get("/customers", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const q           = (req.query.q as string | undefined)?.trim() ?? "";
  const showArchived = req.query.archived === "true";

  try {
    let rows = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.userId, clientId),
          eq(customers.isArchived, showArchived),
          q ? ilike(customers.name, `%${q}%`) : undefined,
        ),
      )
      .orderBy(desc(customers.updatedAt));

    // Also get site counts for each customer
    const customerIds = rows.map((r) => r.id);
    let siteCounts: Record<string, number> = {};

    if (customerIds.length > 0) {
      const siteRows = await db
        .select()
        .from(customerSites)
        .where(
          and(
            eq(customerSites.userId, clientId),
            eq(customerSites.isArchived, false),
          ),
        );
      for (const site of siteRows) {
        siteCounts[site.customerId] = (siteCounts[site.customerId] ?? 0) + 1;
      }
    }

    // Also get unit counts
    let unitCounts: Record<string, number> = {};
    if (customerIds.length > 0) {
      const unitRows = await db
        .select({ customerId: unitRecords.customerId })
        .from(unitRecords)
        .where(
          and(
            eq(unitRecords.userId, clientId),
            eq(unitRecords.isArchived, false),
          ),
        );
      for (const unit of unitRows) {
        if (unit.customerId) {
          unitCounts[unit.customerId] = (unitCounts[unit.customerId] ?? 0) + 1;
        }
      }
    }

    const result = rows.map((c) => ({
      ...c,
      siteCount: siteCounts[c.id] ?? 0,
      unitCount: unitCounts[c.id] ?? 0,
    }));

    // If searching and not enough exact matches, also match on contact or phone
    if (q && result.length < 20) {
      const contactRows = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.userId, clientId),
            eq(customers.isArchived, showArchived),
            or(
              ilike(customers.contactName, `%${q}%`),
              ilike(customers.phone, `%${q}%`),
            ),
          ),
        );
      const existing = new Set(result.map((r) => r.id));
      for (const c of contactRows) {
        if (!existing.has(c.id)) {
          result.push({
            ...c,
            siteCount: siteCounts[c.id] ?? 0,
            unitCount: unitCounts[c.id] ?? 0,
          });
        }
      }
    }

    res.json({ customers: result });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "42P01") { res.json({ customers: [] }); return; }
    req.log?.error(err, "GET /customers failed");
    res.status(500).json({ error: "Failed to list customers" });
  }
});

// ─── GET /api/customers/:id ───────────────────────────────────────────────────

customersRouter.get("/customers/:id", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const customerId = String(req.params.id);

  try {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.userId, clientId)));

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    // Fetch sites
    const sites = await db
      .select()
      .from(customerSites)
      .where(
        and(
          eq(customerSites.customerId, customerId),
          eq(customerSites.isArchived, false),
        ),
      )
      .orderBy(customerSites.siteName);

    // Fetch units linked to this customer (by FK or by name match on siteCustomerName)
    const linkedUnits = await db
      .select()
      .from(unitRecords)
      .where(
        and(
          eq(unitRecords.userId, clientId),
          eq(unitRecords.isArchived, false),
          or(
            eq(unitRecords.customerId, customerId),
            ilike(unitRecords.siteCustomerName, customer.name),
          ),
        ),
      )
      .orderBy(desc(unitRecords.updatedAt))
      .limit(50);

    // Fetch recent jobs — match by customer name (text denormalized field)
    const recentJobs = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, clientId),
          ilike(jobs.customer, `%${customer.name}%`),
        ),
      )
      .orderBy(desc(jobs.startedAt))
      .limit(20);

    // Group units by siteId for each site
    const siteIds = new Set(sites.map((s) => s.id));
    const siteUnits: Record<string, typeof linkedUnits> = {};
    const customerUnits: typeof linkedUnits = [];

    for (const unit of linkedUnits) {
      if (unit.siteId && siteIds.has(unit.siteId)) {
        if (!siteUnits[unit.siteId]) siteUnits[unit.siteId] = [];
        siteUnits[unit.siteId].push(unit);
      } else {
        customerUnits.push(unit);
      }
    }

    const sitesWithUnits = sites.map((site) => ({
      ...site,
      units: siteUnits[site.id] ?? [],
    }));

    res.json({
      customer: {
        ...customer,
        sites: sitesWithUnits,
        units: customerUnits,
        recentJobs,
      },
    });
  } catch (err: unknown) {
    req.log?.error(err, "GET /customers/:id failed");
    res.status(500).json({ error: "Failed to load customer" });
  }
});

// ─── POST /api/customers ──────────────────────────────────────────────────────

customersRouter.post("/customers", async (req: Request, res: Response) => {
  const body = CustomerBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { clientId, ...fields } = body.data;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const now = new Date();
    const [customer] = await db
      .insert(customers)
      .values({
        id:        uid(),
        userId:    clientId,
        ...fields,
        isArchived: false,
        createdAt:  now,
        updatedAt:  now,
      })
      .returning();

    res.status(201).json({ customer });
  } catch (err: unknown) {
    req.log?.error(err, "POST /customers failed");
    res.status(500).json({ error: "Failed to create customer" });
  }
});

// ─── PATCH /api/customers/:id ─────────────────────────────────────────────────

customersRouter.patch("/customers/:id", async (req: Request, res: Response) => {
  const body = CustomerBodySchema.partial().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { clientId, ...fields } = body.data;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const customerId = String(req.params.id);

  try {
    const [updated] = await db
      .update(customers)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.userId, clientId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    res.json({ customer: updated });
  } catch (err: unknown) {
    req.log?.error(err, "PATCH /customers/:id failed");
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// ─── DELETE /api/customers/:id (archive) ─────────────────────────────────────

customersRouter.delete("/customers/:id", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const customerId = String(req.params.id);

  try {
    await db
      .update(customers)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.userId, clientId)));

    res.json({ success: true });
  } catch (err: unknown) {
    req.log?.error(err, "DELETE /customers/:id failed");
    res.status(500).json({ error: "Failed to archive customer" });
  }
});

// ─── POST /api/customers/:id/sites ───────────────────────────────────────────

customersRouter.post("/customers/:id/sites", async (req: Request, res: Response) => {
  const body = SiteBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { clientId, ...fields } = body.data;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const customerId = String(req.params.id);

  // Verify customer belongs to user
  try {
    const [cust] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.userId, clientId)));

    if (!cust) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const now = new Date();
    const [site] = await db
      .insert(customerSites)
      .values({
        id:         siteUid(),
        customerId,
        userId:     clientId,
        ...fields,
        isArchived: false,
        createdAt:  now,
        updatedAt:  now,
      })
      .returning();

    res.status(201).json({ site });
  } catch (err: unknown) {
    req.log?.error(err, "POST /customers/:id/sites failed");
    res.status(500).json({ error: "Failed to create site" });
  }
});

// ─── PATCH /api/customer-sites/:siteId ───────────────────────────────────────

customersRouter.patch("/customer-sites/:siteId", async (req: Request, res: Response) => {
  const body = SiteBodySchema.partial().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { clientId, ...fields } = body.data;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const siteId = String(req.params.siteId);

  try {
    const [updated] = await db
      .update(customerSites)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(customerSites.id, siteId), eq(customerSites.userId, clientId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Site not found" });
      return;
    }

    res.json({ site: updated });
  } catch (err: unknown) {
    req.log?.error(err, "PATCH /customer-sites/:siteId failed");
    res.status(500).json({ error: "Failed to update site" });
  }
});

// ─── DELETE /api/customer-sites/:siteId (archive) ────────────────────────────

customersRouter.delete("/customer-sites/:siteId", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const siteId = String(req.params.siteId);

  try {
    await db
      .update(customerSites)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(customerSites.id, siteId), eq(customerSites.userId, clientId)));

    res.json({ success: true });
  } catch (err: unknown) {
    req.log?.error(err, "DELETE /customer-sites/:siteId failed");
    res.status(500).json({ error: "Failed to archive site" });
  }
});

// ─── PATCH /api/units/:unitId/link-customer ───────────────────────────────────
// Links an existing unit record to a customer (and optionally a site).
// Also updates siteCustomerName to the customer's name for display compatibility.

customersRouter.patch("/units/:unitId/link-customer", async (req: Request, res: Response) => {
  const { clientId, customerId, siteId } = req.body ?? {};

  if (!validateClientId(clientId)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const unitId = String(req.params.unitId);

  try {
    // Get customer name for denormalized siteCustomerName update
    let customerName: string | undefined;
    if (customerId) {
      const [cust] = await db
        .select({ name: customers.name })
        .from(customers)
        .where(and(eq(customers.id, customerId as string), eq(customers.userId, clientId)));
      customerName = cust?.name;
    }

    const [updated] = await db
      .update(unitRecords)
      .set({
        customerId:       customerId ?? null,
        siteId:           siteId ?? null,
        siteCustomerName: customerName ?? undefined,
        updatedAt:        new Date(),
      })
      .where(and(eq(unitRecords.id, unitId), eq(unitRecords.userId, clientId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Unit not found" });
      return;
    }

    res.json({ unit: updated });
  } catch (err: unknown) {
    req.log?.error(err, "PATCH /units/:unitId/link-customer failed");
    res.status(500).json({ error: "Failed to link unit to customer" });
  }
});

export default customersRouter;
