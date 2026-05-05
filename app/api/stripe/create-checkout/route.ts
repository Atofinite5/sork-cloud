import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

export async function POST(): Promise<Response> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return Response.json(
      { error: 'STRIPE_PRO_PRICE_ID not configured' },
      { status: 503 },
    );
  }

  // Find our internal user
  const userRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!userRows[0]) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const { id: userId, email } = userRows[0];

  // Check for existing Stripe customer
  const subRows = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  let customerId = subRows[0]?.stripeCustomerId;

  if (!customerId) {
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId, clerkId },
    });
    customerId = customer.id;

    // Upsert subscription row with customer ID so future lookups work
    await db
      .insert(subscriptions)
      .values({
        userId,
        stripeCustomerId: customerId,
        status: 'incomplete',
        plan: 'free',
      })
      .onConflictDoNothing();
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${APP_URL}/pricing`,
    metadata: { userId, clerkId },
    subscription_data: {
      metadata: { userId, clerkId },
    },
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
