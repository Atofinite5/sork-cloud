import Stripe from 'stripe';

/**
 * Stripe client — kept available for future migration to recurring billing.
 * Currently unused at the pricing page (option A: Skydo Payment Links + manual fulfillment).
 */
function createStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env.local to use Stripe billing.',
    );
  }
  return new Stripe(key, { typescript: true });
}

let _stripe: Stripe | null = null;

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) _stripe = createStripeClient();
    return Reflect.get(_stripe, prop);
  },
});

/**
 * Plan definitions.
 *
 * Payment is currently handled via Skydo Payment Links — set the URLs in
 * .env.local (NEXT_PUBLIC_PAYMENT_LINK_PRO, NEXT_PUBLIC_PAYMENT_LINK_PRO_PLUS).
 *
 * After a user pays through Skydo, you upgrade them manually using the
 * /api/admin/upgrade endpoint — see app/payment-success/ for the workflow.
 */
/** Lifetime free requests. Once exhausted, user must upgrade. */
export const FREE_REQUEST_LIMIT = 14;

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Try it free. No card required.',
    monthlyPrice: 0,
    annualPrice: 0,
    priceLabel: '$0',
    priceUnit: 'forever',
    paymentLink: null,
    paymentLinkAnnual: null,
    requestLimit: FREE_REQUEST_LIMIT,
    keysAllowed: 1,
    features: [
      `${FREE_REQUEST_LIMIT} free AI requests`,
      '1 API key',
      'AST-based detection',
      'Community support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For serious solo developers.',
    monthlyPrice: 19,
    annualPrice: 190,            // 10 × monthly = 2 months free (save 17%)
    priceLabel: '$19',
    priceUnit: '/ mo',
    paymentLink: process.env.NEXT_PUBLIC_PAYMENT_LINK_PRO,
    paymentLinkAnnual: process.env.NEXT_PUBLIC_PAYMENT_LINK_PRO_ANNUAL,
    requestLimit: Infinity,
    keysAllowed: 5,
    popularReason: 'Most teams pick Pro — unlimited AI requests for the price of two coffees a month.',
    features: [
      'Unlimited AI requests',
      '5 API keys',
      'AI-powered triage + fixes',
      'Priority email support',
      'Usage dashboard',
    ],
  },
  pro_plus: {
    id: 'pro_plus',
    name: 'Pro Plus',
    tagline: 'For teams and power users.',
    monthlyPrice: 28,
    annualPrice: 280,            // 10 × monthly = 2 months free (save 17%)
    priceLabel: '$28',
    priceUnit: '/ mo',
    paymentLink: process.env.NEXT_PUBLIC_PAYMENT_LINK_PRO_PLUS,
    paymentLinkAnnual: process.env.NEXT_PUBLIC_PAYMENT_LINK_PRO_PLUS_ANNUAL,
    requestLimit: Infinity,
    keysAllowed: 20,
    features: [
      'Everything in Pro',
      '20 API keys',
      'Custom rule packs',
      'Priority chat support',
      'Audit log export',
      'Early access features',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** Returns true when beta-free mode is on — everyone gets Pro Plus for free. */
export function isBetaFree(): boolean {
  return process.env.NEXT_PUBLIC_BETA_FREE === 'true';
}

/** Effective plan for a user — Pro Plus if beta-free, otherwise their actual plan. */
export function effectivePlan(dbPlan: PlanId): PlanId {
  if (isBetaFree()) return 'pro_plus';
  return dbPlan;
}
