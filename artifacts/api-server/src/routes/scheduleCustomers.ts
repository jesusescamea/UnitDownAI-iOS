/**
 * GET /api/schedule/customers?clientId=user_xxx&q=searchTerm
 *
 * Returns up to 10 customer/site matches drawn from:
 *   1. customers.name                 (dedicated customer records — highest priority)
 *   2. unit_records.site_customer_name (equipment-linked customers)
 *   3. jobs.customer                   (historical job customers)
 *
 * Used by the Talk Schedule conversation wizard and Tap to Schedule to
 * populate customer search with real saved data.
 */

import { Router, type Request, type Response } from "express";
import { db, unitRecords, jobs, customers } from "@workspace/db";
import { ilike, and, eq } from "drizzle-orm";

const scheduleCustomersRouter = Router();

function validateClientId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("user_") && id.length < 200;
}

scheduleCustomersRouter.get(
  "/schedule/customers",
  async (req: Request, res: Response) => {
    const { clientId, q } = req.query;

    if (!validateClientId(clientId)) {
      res.status(400).json({ error: "Invalid or missing clientId" });
      return;
    }

    const term    = typeof q === "string" ? q.trim() : "";
    const pattern = term ? `%${term}%` : "%";

    try {
      const [customerRows, unitRows, jobRows] = await Promise.all([
        // 1. Dedicated customer records (highest priority)
        db
          .select({ name: customers.name, id: customers.id })
          .from(customers)
          .where(
            and(
              eq(customers.userId, clientId),
              eq(customers.isArchived, false),
              ilike(customers.name, pattern),
            ),
          )
          .limit(10),

        // 2. Equipment-linked customer names
        db
          .selectDistinct({ name: unitRecords.siteCustomerName })
          .from(unitRecords)
          .where(ilike(unitRecords.siteCustomerName, pattern))
          .limit(10),

        // 3. Historical job customer names
        db
          .selectDistinct({ name: jobs.customer })
          .from(jobs)
          .where(ilike(jobs.customer, pattern))
          .limit(10),
      ]);

      // Merge + deduplicate (case-insensitive), customers first
      const seen    = new Set<string>();
      const results: { name: string; id?: string }[] = [];

      for (const row of customerRows) {
        const name = row.name?.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!seen.has(key)) { seen.add(key); results.push({ name, id: row.id }); }
      }

      for (const row of [...unitRows, ...jobRows]) {
        const name = row.name?.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!seen.has(key)) { seen.add(key); results.push({ name }); }
      }

      // Sort: exact matches first, then alphabetical
      const lowerTerm = term.toLowerCase();
      results.sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(lowerTerm);
        const bStarts = b.name.toLowerCase().startsWith(lowerTerm);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      });

      res.json({ customers: results.slice(0, 10) });
    } catch (err) {
      req.log?.error({ err }, "schedule/customers query failed");
      res.status(500).json({ error: "Failed to search customers" });
    }
  }
);

export default scheduleCustomersRouter;
