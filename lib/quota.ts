import { db } from './db';
import { subscriptions, usageEvents, licenseKeys } from './db/schema';
import { eq, count, and, isNull } from 'drizzle-orm';
import { effectivePlan, PLANS, FREE_REQUEST_LIMIT, type PlanId } from './stripe';

export interface UserQuota {
  plan: PlanId;
  limit: number;       // Infinity for paid plans
  used: number;
  remaining: number;   // Infinity for paid plans
  exhausted: boolean;
  unlimited: boolean;
}

/**
 * Returns how many AI requests a user has used vs. their plan limit.
 *
 * Free plan: 14 lifetime requests (then locked out — must upgrade).
 * Pro / Pro Plus: unlimited.
 *
 * NEXT_PUBLIC_BETA_FREE=true overrides everyone to Pro Plus (unlimited).
 */
export async function getUserQuota(userId: string): Promise<UserQuota> {
  const subRows = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const dbPlan = (subRows[0]?.plan as PlanId | undefined) ?? 'free';
  const plan = effectivePlan(dbPlan);

  // Paid plans = unlimited
  if (plan === 'pro' || plan === 'pro_plus') {
    return {
      plan,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      exhausted: false,
      unlimited: true,
    };
  }

  // Free plan — count lifetime usage
  const result = await db
    .select({ value: count() })
    .from(usageEvents)
    .where(eq(usageEvents.userId, userId));

  const used = Number(result[0]?.value ?? 0);
  const limit = FREE_REQUEST_LIMIT;
  const remaining = Math.max(0, limit - used);

  return {
    plan: 'free',
    limit,
    used,
    remaining,
    exhausted: used >= limit,
    unlimited: false,
  };
}

/** Count active (non-revoked) keys for a user. */
export async function getActiveKeyCount(userId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(licenseKeys)
    .where(and(eq(licenseKeys.userId, userId), isNull(licenseKeys.revokedAt)));
  return Number(result[0]?.value ?? 0);
}

/** Returns true if the user can issue another key under their plan's keysAllowed. */
export async function canIssueKey(userId: string): Promise<{ allowed: boolean; reason?: string; limit: number }> {
  const subRows = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const dbPlan = (subRows[0]?.plan as PlanId | undefined) ?? 'free';
  const plan = effectivePlan(dbPlan);
  const limit = PLANS[plan].keysAllowed;

  const activeCount = await getActiveKeyCount(userId);
  if (activeCount >= limit) {
    return {
      allowed: false,
      reason:
        plan === 'free'
          ? `Free plan allows ${limit} key. Upgrade to issue more.`
          : `Your plan allows ${limit} keys. Revoke an unused one to issue a new key.`,
      limit,
    };
  }

  return { allowed: true, limit };
}
