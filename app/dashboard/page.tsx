import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { effectivePlan, PLANS, isBetaFree } from '@/lib/stripe';
import { KeyManager } from './_components/KeyManager';
import { UsageBar } from './_components/UsageBar';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? '';
  const firstName = user?.firstName ?? email.split('@')[0];
  const { upgraded } = await searchParams;

  // Resolve plan from DB (best-effort — no DB = free plan shown)
  let dbPlan: 'free' | 'pro' | 'pro_plus' = 'free';
  try {
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, user?.id ?? ''))
      .limit(1);

    if (userRows[0]) {
      const subRows = await db
        .select({ plan: subscriptions.plan })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userRows[0].id))
        .limit(1);
      dbPlan = (subRows[0]?.plan as typeof dbPlan) ?? 'free';
    }
  } catch {
    // DB not connected yet — show free plan silently
  }

  const plan = effectivePlan(dbPlan);
  const betaFree = isBetaFree();

  return (
    <main className="min-h-screen flex flex-col">

      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-mono text-base font-semibold tracking-tight">
            SORK<span className="text-accent">.cloud</span>
          </Link>
          <Link href="/pricing" className="text-sm text-muted hover:text-fg transition-colors hidden sm:block">
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted hidden sm:block">{email}</span>
          <UserButton />
        </div>
      </header>

      {/* ─── Body ───────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-10 max-w-3xl mx-auto w-full space-y-10">

        {/* Upgrade success */}
        {upgraded === 'true' && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-5 py-4 flex items-center gap-3">
            <span className="text-green-400 text-xl">🎉</span>
            <div>
              <p className="font-semibold text-green-400 text-sm">Welcome to Pro!</p>
              <p className="text-xs text-muted mt-0.5">Your plan is active. All limits lifted.</p>
            </div>
          </div>
        )}

        {/* Beta banner */}
        {betaFree && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-3 flex items-center gap-3">
            <span className="text-accent">✦</span>
            <p className="text-sm text-muted">
              <span className="text-fg font-medium">Beta period — all features free.</span>{' '}
              Pricing will be introduced with 30 days notice.
            </p>
          </div>
        )}

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Issue an API key, paste it in the CLI, and you&apos;re ready to scan.
          </p>
        </div>

        {/* Usage / quota */}
        <UsageBar />

        {/* Quick start */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div className="text-xs text-muted uppercase tracking-widest">Quick start</div>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Step n="1" />
              <span className="text-muted pt-0.5">Issue a key below</span>
            </li>
            <li className="flex items-start gap-3">
              <Step n="2" />
              <span className="text-muted pt-0.5">
                Run{' '}
                <code className="font-mono text-accent text-xs bg-accent/10 px-1.5 py-0.5 rounded">
                  sork config set-key sork_live_…
                </code>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Step n="3" />
              <span className="text-muted pt-0.5">
                Run{' '}
                <code className="font-mono text-accent text-xs bg-accent/10 px-1.5 py-0.5 rounded">
                  sork scan
                </code>{' '}
                in any Node.js project
              </span>
            </li>
          </ol>
        </div>

        {/* API Keys */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">API Keys</h2>
            <span className="text-xs text-muted">Plaintext shown once · stored as hash</span>
          </div>
          <KeyManager />
        </section>

        {/* Plan */}
        <section>
          <h2 className="text-base font-semibold mb-4">Plan</h2>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{PLANS[plan].name}</span>
                  {plan === 'pro' && (
                    <span className="text-xs rounded-full bg-accent/20 text-accent px-2 py-0.5 font-medium">
                      {betaFree ? 'beta free' : 'active'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-1">
                  {plan === 'pro_plus'
                    ? `Unlimited requests · ${PLANS.pro_plus.keysAllowed} API keys`
                    : plan === 'pro'
                      ? `Unlimited requests · ${PLANS.pro.keysAllowed} API keys`
                      : `${PLANS.free.requestLimit} free requests · ${PLANS.free.keysAllowed} API key`}
                </p>
              </div>
              {plan !== 'pro' && (
                <Link
                  href="/pricing"
                  className="rounded-lg bg-accent text-black font-semibold px-4 py-2 text-sm hover:bg-cyan-300 transition-colors"
                >
                  Upgrade →
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-base font-semibold mb-4">Account</h2>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3 text-sm">
            <Row label="Email" value={email} />
            <Row label="Clerk ID" value={user?.id ?? '—'} mono />
          </div>
        </section>

      </div>
    </main>
  );
}

function Step({ n }: { n: string }) {
  return (
    <span className="shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-muted font-mono">
      {n}
    </span>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={mono ? 'font-mono text-xs text-neutral-400' : ''}>{value}</span>
    </div>
  );
}
