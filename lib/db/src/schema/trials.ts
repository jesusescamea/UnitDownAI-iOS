import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Tracks the 7-day / 25-credit Pro Trial and engagement reward history
 * for every authenticated Clerk user.
 *
 * A row is created on first use (getOrCreateTrial) and persists for the
 * lifetime of the account.  Pro subscribers bypass all trial checks.
 *
 * rewardsEarned stores reward IDs as a PostgreSQL text array, e.g.:
 *   '{account_created,first_diagnosis,first_unit_saved}'
 */
export const userTrials = pgTable("user_trials", {
  userId: text("user_id").primaryKey(),

  trialStartedAt: timestamp("trial_started_at").defaultNow().notNull(),

  // Consumed on each successful AI or KB diagnosis.
  // Bonus credits are added by the /usage/reward endpoint (once per reward).
  diagnosticCredits: integer("diagnostic_credits").notNull().default(25),

  // Reward IDs that have already been awarded — prevents double-awarding.
  rewardsEarned: text("rewards_earned")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserTrial = typeof userTrials.$inferSelect;
export type InsertUserTrial = typeof userTrials.$inferInsert;
