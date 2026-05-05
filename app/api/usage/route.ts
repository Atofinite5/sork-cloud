import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserQuota } from '@/lib/quota';

/**
 * Returns the signed-in user's quota status — feeds the dashboard UsageBar.
 */
export async function GET(): Promise<Response> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!userRows[0]) {
    return Response.json({
      plan: 'free',
      limit: 14,
      used: 0,
      remaining: 14,
      exhausted: false,
      unlimited: false,
    });
  }

  const quota = await getUserQuota(userRows[0].id);
  return Response.json({
    ...quota,
    limit: quota.unlimited ? 'unlimited' : quota.limit,
    remaining: quota.unlimited ? 'unlimited' : quota.remaining,
  });
}
