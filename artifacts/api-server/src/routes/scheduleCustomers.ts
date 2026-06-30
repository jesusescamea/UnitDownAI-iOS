/**
 * GET /api/schedule/customers?clientId=user_xxx&q=searchTerm
 *
 * Returns up to 10 customer/site matches drawn from:
 *   1. unit_records.site_customer_name  (equipment-linked customers)
 *   2. jobs.customer                    (historical job customers)
 *
 * Used by the Talk Schedule conversation wizard to populate the existing
 * customer search step with real saved data.
 */

import { Router, type Request, type Response } from "express";
import { db, unitRecords, jobs } from "@workspace/db";
import { ilike, isNotNull } from "drizzle-orm";

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
      const [unitRows, jobRows] = await Promise.all([
        db
          .selectDistinct({ name: unitRecords.siteCustomerName })
          .from(unitRecords)
          .where(ilike(unitRecords.siteCustomerName, pattern))
          .limit(10),

        db
          .selectDistinct({ name: jobs.customer })
          .from(jobs)
          .where(ilike(jobs.customer, pattern))
          .limit(10),
      ]);

      // Merge + deduplicate (case-insensitive)
      const seen = new Set<string>();
      const customers: { name: string }[] = [];

      for (const row of [...unitRows, ...jobRows]) {
        const name = row.name?.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          customers.push({ name });
        }
      }

      // Sort: exact matches first, then alphabetical
      const lowerTerm = term.toLowerCase();
      customers.sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(lowerTerm);
        const bStarts = b.name.toLowerCase().startsWith(lowerTerm);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      });

      res.json({ customers: customers.slice(0, 10) });
    } catch (err) {
      req.log?.error({ err }, "schedule/customers query failed");
      res.status(500).json({ error: "Failed to search customers" });
    }
  }
);

export default scheduleCustomersRouter;
