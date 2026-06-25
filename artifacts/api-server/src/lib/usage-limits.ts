// Shared usage-limit constants and status computation used by both
// the usage router and the hvac router (backstop check).

// ── Anonymous / legacy free tier ─────────────────────────────────────────────
export const FREE_ANON_USES = 4;
export const FREE_AUTH_USES = 4;

export type UsageStatus = "free" | "login_gate" | "upgrade_wall";

/**
 * Determine the current gate status for an anonymous session.
 *
 * Anonymous flow:
 *   useCount 0-1        → free
 *   useCount === 2, emailUnlocked → free (email grant: one extra)
 *   useCount === 2, !emailUnlocked → login_gate  (3rd requires signup/login)
 *   useCount >= 3       → upgrade_wall
 *
 * Authenticated (Clerk) flow (legacy — now replaced by trial system):
 *   useCount 0-2        → free
 *   useCount >= 3       → upgrade_wall
 */
export function computeStatus(
  session: { useCount: number; emailUnlocked: boolean },
  isAuthenticated: boolean
): UsageStatus {
  const { useCount, emailUnlocked } = session;

  if (isAuthenticated) {
    return useCount < FREE_AUTH_USES ? "free" : "upgrade_wall";
  }

  if (useCount < FREE_ANON_USES) return "free";
  if (useCount === FREE_ANON_USES && emailUnlocked) return "free";
  if (useCount > FREE_ANON_USES) return "upgrade_wall";
  return "login_gate";
}

/**
 * How many free diagnostics remain for an anonymous session.
 */
export function remainingFree(
  session: { useCount: number; emailUnlocked: boolean },
  isAuthenticated: boolean
): number {
  const { useCount, emailUnlocked } = session;
  if (isAuthenticated) return Math.max(0, FREE_AUTH_USES - useCount);
  const limit = emailUnlocked ? FREE_AUTH_USES : FREE_ANON_USES;
  return Math.max(0, limit - useCount);
}

// ── Trial system ──────────────────────────────────────────────────────────────

/** Duration of the Pro Trial in days. */
export const TRIAL_DURATION_DAYS = 7;

/** Number of AI diagnostic credits included in the trial. */
export const TRIAL_INITIAL_CREDITS = 25;

/** Credits awarded per engagement reward action. */
export const TRIAL_REWARD_CREDITS = 5;

/** Valid reward action IDs — each may only be earned once per user. */
export const REWARD_IDS = [
  "account_created",
  "first_diagnosis",
  "first_unit_saved",
  "first_photo",
  "first_timeline_entry",
] as const;

export type RewardId = (typeof REWARD_IDS)[number];

export interface TrialStatus {
  /** True when daysLeft > 0 AND creditsLeft > 0. */
  active: boolean;
  /** Calendar days remaining; 0 when expired by time. */
  daysLeft: number;
  /** Diagnostic credits remaining; 0 when exhausted. */
  creditsLeft: number;
  /** ISO timestamp of when the trial started. */
  trialStartedAt: Date;
  /** Reward IDs that have already been awarded. */
  rewardsEarned: string[];
}

/**
 * Compute the current trial status from a stored trial row.
 * Pure function — does not touch the DB.
 */
export function computeTrialStatus(trial: {
  trialStartedAt: Date;
  diagnosticCredits: number;
  rewardsEarned: string[];
}): TrialStatus {
  const elapsedMs = Date.now() - trial.trialStartedAt.getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DURATION_DAYS - elapsedDays));
  const creditsLeft = Math.max(0, trial.diagnosticCredits);

  return {
    active: daysLeft > 0 && creditsLeft > 0,
    daysLeft,
    creditsLeft,
    trialStartedAt: trial.trialStartedAt,
    rewardsEarned: trial.rewardsEarned ?? [],
  };
}
