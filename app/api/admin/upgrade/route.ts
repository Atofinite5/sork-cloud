import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isAdmin } from '@/lib/admin';
import { z } from 'zod';

const bodySchema = z.object({
  email: z.string().email(),
  plan: z.enum(['free', 'pro', 'pro_plus']),
});

/**
 * Manual upgrade endpoint — call this after confirming a Skydo payment.
 *
 *   curl -X POST https://sorkcloud.space/api/admin/upgrade \
 *     -H "Content-Type: application/json" \
 *     -H "Cookie: <your Clerk session cookie>" \
 *     -d '{"email":"customer@example.com","plan":"pro_plus"}'
 *
 * Or just call it from the dashboard once we add an admin UI.
 */
export async function POST(req: Request): Promise<Response> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isAdmin(clerkId)) {
    return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: 'Invalid body. Expected { email, plan }' }, { status: 400 });
  }

  // Find target user
  const userRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (!userRows[0]) {
    return Response.json({ error: `No user with email ${body.email}` }, { status: 404 });
  }

  const userId = userRows[0].id;

  // Upsert subscription row
  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(subscriptions)
      .set({
        plan: body.plan,
        status: body.plan === 'free' ? 'canceled' : 'active',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      // Manual flow has no Stripe customer; placeholder until Stripe is wired
      stripeCustomerId: `manual_${userId}`,
      status: body.plan === 'free' ? 'canceled' : 'active',
      plan: body.plan,
    });
  }

  return Response.json({
    upgraded: true,
    email: body.email,
    plan: body.plan,
  });
}
