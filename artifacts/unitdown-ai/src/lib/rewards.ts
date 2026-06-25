/**
 * rewards.ts
 *
 * Client-side helper for awarding diagnostic credit bonuses to authenticated
 * users for first-time onboarding actions.
 *
 * Each reward ID can only be earned once per account (server enforces this).
 * The return value tells the caller whether bonus credits were actually awarded
 * so it can show a toast notification.
 *
 * Safe to call on web — no-ops silently for unauthenticated (non-user_xxx) IDs.
 *
 * Reward IDs that map to +5 credits each (once per account):
 *   account_created       — first login / account creation
 *   first_diagnosis       — first successful AI diagnosis
 *   first_unit_saved      — first equipment record saved
 *   first_photo           — first photo or nameplate uploaded
 *   first_timeline_entry  — first equipment timeline entry added
 */

export interface RewardResult {
  bonusCredits: number;
  totalCredits: number;
  alreadyEarned: boolean;
}

/**
 * Call the /api/usage/reward endpoint to award bonus credits for a one-time
 * onboarding action.  Returns null on network error or for unauthenticated
 * users — callers should ignore null silently.
 */
export async function awardReward(
  clientId: string,
  rewardId: string
): Promise<RewardResult | null> {
  if (!clientId.startsWith("user_")) return null;
  try {
    const res = await fetch("/api/usage/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, rewardId }),
    });
    if (!res.ok) return null;
    return (await res.json()) as RewardResult;
  } catch {
    return null;
  }
}
