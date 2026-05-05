import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { PLANS, type PlanId } from '@/lib/stripe';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? '';
  const { plan: planParam } = await searchParams;

  // Default to "pro" if Skydo didn't pass through the plan param
  const planId: PlanId = planParam === 'pro_plus' ? 'pro_plus' : 'pro';
  const plan = PLANS[planId];

  return (
    <main className="min-h-screen flex flex-col">

      {/* ─── Header ─────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <Link href="/" className="font-mono text-base font-semibold tracking-tight">
          SORK<span className="text-accent">.cloud</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-muted hover:text-fg transition-colors">
          Dashboard →
        </Link>
      </header>

      {/* ─── Body ───────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">

        <div className="rounded-full bg-green-500/10 border border-green-500/30 p-4 mb-6">
          <span className="text-4xl">✓</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Thanks for upgrading
        </h1>
        <p className="mt-4 text-muted">
          We received your click-through to{' '}
          <span className="text-fg font-semibold">{plan.name}</span>.
        </p>

        {/* Status box */}
        <div className="mt-10 w-full rounded-xl border border-white/10 bg-white/[0.02] p-6 text-left space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-accent text-lg mt-0.5">①</span>
            <div className="text-sm">
              <div className="font-medium text-fg">Complete payment in Skydo</div>
              <div className="text-muted mt-0.5">
                If you haven&apos;t finished, the Skydo tab is still open.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-accent text-lg mt-0.5">②</span>
            <div className="text-sm">
              <div className="font-medium text-fg">Your account is upgraded within 24 hours</div>
              <div className="text-muted mt-0.5">
                We manually match Skydo payments to accounts during beta.
                You&apos;ll get an email at <span className="font-mono text-fg">{email}</span>.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-accent text-lg mt-0.5">③</span>
            <div className="text-sm">
              <div className="font-medium text-fg">Issue your API key</div>
              <div className="text-muted mt-0.5">
                Your existing keys keep working. New keys count against the higher quota.
              </div>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="mt-8 text-sm text-muted">
          Questions or delay?{' '}
          <a
            href={`mailto:support@sorkcloud.space?subject=Pro upgrade — ${email}`}
            className="text-accent hover:underline"
          >
            support@sorkcloud.space
          </a>
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="mt-10 rounded-xl bg-accent text-black font-bold px-6 py-3 hover:bg-cyan-300 transition-colors"
        >
          Go to dashboard
        </Link>
      </section>

      <footer className="px-8 py-5 border-t border-white/[0.06] text-xs text-muted text-center">
        © 2026 SORK.cloud · Manual fulfillment during beta
      </footer>
    </main>
  );
}
