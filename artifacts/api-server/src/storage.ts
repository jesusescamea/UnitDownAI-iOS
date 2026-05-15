import { sql } from 'drizzle-orm';
import { db } from '@workspace/db';
import { users } from '@workspace/db';

export class Storage {
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
    // iOS-only build: no live Stripe checks. Returns true only if a
    // subscription record exists in the DB (legacy data or future Apple
    // receipt validation rows). New iOS IAP subscribers always start at false
    // here — Pro status is managed client-side via Apple IAP until server-side
    // receipt validation is added.
    const user = await this.getUser(clientId);
    return !!(user?.stripeSubscriptionId);
  }

  async clearSubscriptionBySubscriptionId(subscriptionId: string): Promise<void> {
    await db
      .update(users)
      .set({ stripeSubscriptionId: null })
      .where(sql`${users.stripeSubscriptionId} = ${subscriptionId}`);
  }
}

export const storage = new Storage();
