'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { PLANS, type PlanId } from '@/lib/stripe';

type Period = 'monthly' | 'annual';

export function PricingTiers({
  betaFree,
  appUrl,
}: {
  betaFree: boolean;
  appUrl: string;
}) {
  const [period, setPeriod] = useState<Period>('monthly');

  return (
    <>
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <BillingToggle value={period} onChange={setPeriod} />
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto w-full">
        <PlanCard plan="free" period={period} betaFree={betaFree} appUrl={appUrl} />
        <PlanCard plan="pro" period={period} betaFree={betaFree} appUrl={appUrl} popular />
        <PlanCard plan="pro_plus" period={period} betaFree={betaFree} appUrl={appUrl} />
      </div>
    </>
  );
}

function BillingToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (v: Period) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] p-1 text-sm">
      <button
        onClick={() => onChange('monthly')}
        className={[
          'rounded-full px-4 py-1.5 transition-colors',
          value === 'monthly' ? 'bg-fg text-bg font-semibold' : 'text-muted hover:text-fg',
        ].join(' ')}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('annual')}
        className={[
          'rounded-full px-4 py-1.5 transition-colors flex items-center gap-2',
          value === 'annual' ? 'bg-fg text-bg font-semibold' : 'text-muted hover:text-fg',
        ].join(' ')}
      >
        Annual
        <span className={[
          'text-[10px] font-bold rounded-full px-1.5 py-0.5',
          value === 'annual' ? 'bg-bg text-accent' : 'bg-accent/15 text-accent',
        ].join(' ')}>
          SAVE 17%
        </span>
      </button>
    </div>
  );
}

function PopularBadge({ reason }: { reason: string }) {
  return (
    <div className="group absolute top-0 right-0 z-10">
      <div className="bg-accent text-black text-[10px] font-bold px-2.5 py-1 rounded-bl-lg tracking-wider cursor-help select-none">
        POPULAR ⓘ
      </div>
      <div className="absolute right-0 top-full mt-1 w-60 hidden group-hover:block bg-black border border-white/15 rounded-lg p-3 text-xs leading-relaxed shadow-2xl">
        <div className="font-semibold text-accent mb-1">Why most pick Pro</div>
        <div className="text-muted">{reason}</div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  period,
  popular = false,
  betaFree,
  appUrl,
}: {
  plan: PlanId;
  period: Period;
  popular?: boolean;
  betaFree: boolean;
  appUrl: string;
}) {
  const p = PLANS[plan];
  const isFree = plan === 'free';

  // Pick price + payment link based on selected period
  const monthlyPrice = p.monthlyPrice;
  const annualPrice = p.annualPrice;
  const displayPrice = period === 'annual' ? annualPrice : monthlyPrice;
  const displayUnit = period === 'annual' ? '/ yr' : '/ mo';

  const link =
    period === 'annual' ? p.paymentLinkAnnual : p.paymentLink;
  const successUrl = `${appUrl}/payment-success?plan=${plan}`;
  const paymentHref = link && link !== '' ? `${link}?redirectUrl=${encodeURIComponent(successUrl)}` : null;

  // Effective price label
  const priceLabel = isFree ? '$0' : `$${displayPrice}`;
  const showAnnualBenefit = !isFree && period === 'annual';

  return (
    <div
      className={[
        'rounded-2xl p-7 flex flex-col relative overflow-hidden',
        popular
          ? 'border-2 border-accent/50 bg-accent/[0.04]'
          : 'border border-white/10 bg-white/[0.02]',
      ].join(' ')}
    >
      {popular && 'popularReason' in p && p.popularReason && (
        <PopularBadge reason={p.popularReason} />
      )}

      <div className={['text-xs font-medium uppercase tracking-widest mb-3', popular ? 'text-accent' : 'text-muted'].join(' ')}>
        {p.name}
      </div>

      {/* Price */}
      {betaFree && !isFree ? (
        <div className="mb-1">
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-muted text-sm mb-1">{displayUnit} during beta</span>
          </div>
          <p className="text-xs text-muted line-through mt-0.5">
            {priceLabel} {displayUnit} after launch
            {showAnnualBenefit && ` · save $${monthlyPrice * 12 - annualPrice}`}
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-4xl font-bold">{priceLabel}</span>
            <span className="text-muted text-sm mb-1">
              {isFree ? 'forever' : displayUnit}
            </span>
          </div>
          {showAnnualBenefit && (
            <p className="text-xs text-accent mt-0.5">
              Save ${monthlyPrice * 12 - annualPrice} vs monthly
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-muted mb-7 mt-3">{p.tagline}</p>

      <ul className="space-y-3 mb-8 flex-1">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <span className={popular ? 'text-accent mt-0.5' : 'text-muted mt-0.5'}>✓</span>
            <span className={popular ? 'text-fg' : 'text-muted'}>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isFree ? (
        <>
          <SignedOut>
            <Link
              href="/sign-up"
              className="block text-center rounded-xl border border-white/20 px-5 py-3 font-semibold text-sm hover:bg-white/5 transition-colors"
            >
              Get started free
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="block text-center rounded-xl border border-white/20 px-5 py-3 font-semibold text-sm hover:bg-white/5 transition-colors"
            >
              Go to dashboard
            </Link>
          </SignedIn>
        </>
      ) : !paymentHref ? (
        <button
          disabled
          className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-sm text-muted cursor-not-allowed"
          title={period === 'annual' ? 'Annual billing coming soon — use monthly for now' : 'Payment link not configured'}
        >
          {period === 'annual' ? 'Annual coming soon' : 'Coming soon'}
        </button>
      ) : (
        <>
          <SignedOut>
            <Link
              href="/sign-up"
              className={[
                'block text-center rounded-xl px-5 py-3 font-bold transition-colors',
                popular
                  ? 'bg-accent text-black hover:bg-cyan-300'
                  : 'bg-fg text-bg hover:bg-fg/90',
              ].join(' ')}
            >
              Get {p.name}
            </Link>
          </SignedOut>
          <SignedIn>
            <a
              href={paymentHref}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                'block text-center rounded-xl px-5 py-3 font-bold transition-colors',
                popular
                  ? 'bg-accent text-black hover:bg-cyan-300'
                  : 'bg-fg text-bg hover:bg-fg/90',
              ].join(' ')}
            >
              Get {p.name}
              <span className="ml-1 inline-block">↗</span>
            </a>
          </SignedIn>
        </>
      )}
    </div>
  );
}
