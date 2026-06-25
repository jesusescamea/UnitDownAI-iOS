import { sql } from 'drizzle-orm';
import { db } from '@workspace/db';
import { users, userTrials } from '@workspace/db';
import {
  TRIAL_INITIAL_CREDITS,
  TRIAL_REWARD_CREDITS,
  REWARD_IDS,
  type RewardId,
} from './lib/usage-limits.js';

export class Storage {
  // ── User (Stripe / Pro) ───────────────────────────────────────────────────

  async getUser(clientId: string) {
    const [user] = await db.select().from(users).where(sql`${users.id} = ${clientId}`);
    return user ?? null;
  }

  async upsertUser(clientId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string }) {
    const existing = await this.getUser(clientId);
    if (existing) {
      const [updated] = await db
        .update(users)
        .set(data)
        .where(sql`${users.id} = ${clientId}`)
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(users)
        .values({ id: clientId, ...data })
        .returning();
      return created;
    }
  }

  async getUserByCustomerId(customerId: string) {
    const [user] = await db.select().from(users).where(sql`${users.stripeCustomerId} = ${customerId}`);
    return user ?? null;
  }

  async isProUser(clientId: string | undefined | null): Promise<boolean> {
    if (!clientId) return false;
    // Apple App Store review account bypass.
    const reviewId = process.env.REVIEW_ACCOUNT_CLERK_ID;
    if (reviewId && clientId === reviewId) return true;
    const user = await this.getUser(clientId);
    return !!(user?.stripeSubscriptionId);
  }

  async clearSubscriptionBySubscriptionId(subscriptionId: string): Promise<void> {
    await db
      .update(users)
      .set({ stripeSubscriptionId: null })
      .where(sql`${users.stripeSubscriptionId} = ${subscriptionId}`);
  }

  // ── Trial ─────────────────────────────────────────────────────────────────

  /** Fetch or create the trial row for a Clerk user. Idempotent. */
  async getOrCreateTrial(userId: string) {
    const [existing] = await db
      .select()
      .from(userTrials)
      .where(sql`${userTrials.userId} = ${userId}`);
    if (existing) return existing;

    const [created] = await db
      .insert(userTrials)
      .values({
        userId,
        diagnosticCredits: TRIAL_INITIAL_CREDITS,
        rewardsEarned: [],
      })
      .returning();
    return created;
  }

  /**
   * Atomically decrement diagnostic credits by 1.
   * Only decrements when credits > 0.
   * Returns the new credit count after decrement (0 = exhausted).
   */
  async consumeTrialCredit(userId: string): Promise<number> {
    const [updated] = await db
      .update(userTrials)
      .set({
        diagnosticCredits: sql`GREATEST(${userTrials.diagnosticCredits} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(sql`${userTrials.userId} = ${userId}`)
      .returning({ credits: userTrials.diagnosticCredits });
    return updated?.credits ?? 0;
  }

  /**
   * Award bonus diagnostic credits for a one-time engagement action.
   * Idempotent — calling with an already-earned rewardId returns
   * { bonusCredits: 0, alreadyEarned: true } without touching the DB.
   *
   * @param userId   Clerk user ID
   * @param rewardId One of the REWARD_IDS constants
   */
  async awardReward(
    userId: string,
    rewardId: RewardId
  ): Promise<{ bonusCredits: number; totalCredits: number; alreadyEarned: boolean }> {
    const trial = await this.getOrCreateTrial(userId);

    if ((trial.rewardsEarned ?? []).includes(rewardId)) {
      return { bonusCredits: 0, totalCredits: trial.diagnosticCredits, alreadyEarned: true };
    }

    const [updated] = await db
      .update(userTrials)
      .set({
        diagnosticCredits: sql`${userTrials.diagnosticCredits} + ${TRIAL_REWARD_CREDITS}`,
        rewardsEarned: sql`array_append(${userTrials.rewardsEarned}, ${rewardId}::text)`,
        updatedAt: new Date(),
      })
      .where(sql`${userTrials.userId} = ${userId}`)
      .returning({ credits: userTrials.diagnosticCredits });

    return {
      bonusCredits: TRIAL_REWARD_CREDITS,
      totalCredits: updated?.credits ?? trial.diagnosticCredits + TRIAL_REWARD_CREDITS,
      alreadyEarned: false,
    };
  }

  /**
   * Check whether a reward ID is a recognised constant.
   * Used by the HTTP route to reject unknown reward IDs.
   */
  isValidRewardId(id: string): id is RewardId {
    return (REWARD_IDS as readonly string[]).includes(id);
  }
}

export const storage = new Storage();
