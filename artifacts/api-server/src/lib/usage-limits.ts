// Shared usage-limit constants and status computation used by both
// the usage router and the hvac router (backstop check).

export const FREE_ANON_USES = 4;         // anonymous: up to 4th free
export const FREE_AUTH_USES = 4;         // Clerk users: up to 4th free

export type UsageStatus = "free" | "login_gate" | "upgrade_wall";

/**
 * Determine the current gate status for a session.
 *
 * Anonymous flow:
 *   useCount 0-1        → free
 *   useCount === 2, emailUnlocked → free (email grant: one extra)
 *   useCount === 2, !emailUnlocked → login_gate  (3rd requires signup/login)
 *   useCount >= 3       → upgrade_wall
 *
 * Authenticated (Clerk) flow:
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
 * How many free diagnostics remain for this session.
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
