import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import type { subscriptionStatusEnum, planEnum } from '@/lib/db/schema';

type SubscriptionStatus = typeof subscriptionStatusEnum.enumValues[number];
type Plan = typeof planEnum.enumValues[number];

/**
 * Stripe webhook handler.
 *
 * Setup (one-time):
 *   1. Stripe dashboard → Webhooks → Add endpoint
 *   2. URL: https://<domain>/api/webhooks/stripe
 *   3. Events: checkout.session.completed, customer.subscription.updated,
 *              customer.subscription.deleted, invoice.payment_failed
 *   4. Copy signing secret → STRIPE_WEBHOOK_SECRET in .env.local
 *
 * For local testing: stripe listen --forward-to localhost:3001/api/webhooks/stripe
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new Response('STRIPE_WEBHOOK_SECRET not configured', { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing stripe-signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return new Response('Webhook signature verification failed', { status: 401 });
  }

  try {
    switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      // Ignore unhandled events
      break;
    }
  } catch (err) {
    console.error(`Webhook handler error [${event.type}]:`, err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) return;

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const status = stripeSubscription.status as SubscriptionStatus;
  // current_period_end moved to stripeSubscription.items.data[0] in Stripe v22
  const periodEndTimestamp =
    (stripeSubscription as unknown as { current_period_end?: number }).current_period_end ??
    stripeSubscription.items.data[0]?.billing_thresholds?.usage_gte ??
    0;
  const periodEnd = periodEndTimestamp ? new Date(periodEndTimestamp * 1000) : null;

  await db
    .update(subscriptions)
    .set({
      stripeSubscriptionId: subscriptionId,
      status,
      plan: 'pro',
      currentPeriodEnd: periodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

async function handleSubscriptionUpdate(sub: Stripe.Subscription): Promise<void> {
  const customerId = sub.customer as string;
  const status = sub.status as SubscriptionStatus;
  const periodEndTs = (sub as unknown as { current_period_end?: number }).current_period_end ?? 0;
  const periodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null;

  // Determine plan from price ID
  const priceId = sub.items.data[0]?.price.id;
  const plan: Plan = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'pro' : 'free';

  await db
    .update(subscriptions)
    .set({
      stripeSubscriptionId: sub.id,
      status,
      plan,
      currentPeriodEnd: periodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const customerId = sub.customer as string;

  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      plan: 'free',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  await db
    .update(subscriptions)
    .set({ status: 'past_due', updatedAt: new Date() })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}
