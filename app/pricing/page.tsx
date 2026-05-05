import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { isBetaFree } from '@/lib/stripe';
import { PricingTiers } from './_components/PricingTiers';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

export default function PricingPage() {
  const betaFree = isBetaFree();

  return (
    <main className="min-h-screen flex flex-col">

      {/* ─── Header ─────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <Link href="/" className="font-mono text-base font-semibold tracking-tight">
          SORK<span className="text-accent">.cloud</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <SignedOut>
            <Link href="/sign-in" className="text-muted hover:text-fg transition-colors">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-accent text-black font-semibold px-4 py-1.5 hover:bg-cyan-300 transition-colors"
            >
              Get started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="text-muted hover:text-fg transition-colors">
              Dashboard
            </Link>
          </SignedIn>
        </nav>
      </header>

      {/* ─── Hero ───────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-6 pt-16 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Simple, honest pricing
        </h1>
        <p className="mt-4 text-muted max-w-md">
          Start free. Pay only when you need more. USD payments via Skydo.
        </p>

        {betaFree && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/5 px-4 py-2 text-sm text-green-400">
            <span>🎉</span>
            <span>All plans <strong>free during beta</strong> — early adopters lock in.</span>
          </div>
        )}
      </section>

      {/* ─── Toggle + Plans ─────────────────────────────── */}
      <section className="px-6 pb-16">
        <PricingTiers betaFree={betaFree} appUrl={APP_URL} />
      </section>

      {/* ─── Payment flow note ──────────────────────────── */}
      <section className="px-6 pb-12 max-w-2xl mx-auto w-full">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-muted">
          <p className="font-medium text-fg mb-2">How payment works</p>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>Click your plan above → opens Skydo payment page</li>
            <li>Pay in USD with any international card</li>
            <li>Your account upgrades within 24 hours (manual fulfillment during beta)</li>
            <li>Email <a className="text-accent hover:underline" href="mailto:support@sorkcloud.space">support@sorkcloud.space</a> with your transaction ID if delayed</li>
          </ol>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-2xl mx-auto w-full space-y-6">
        <h2 className="text-lg font-semibold text-center mb-8">FAQ</h2>
        {[
          { q: 'What counts as a request?', a: 'One AI call from the CLI — typically one triage decision or one fix generation. Free plan = 14 lifetime requests.' },
          { q: 'Do I need a credit card for Free?', a: 'No. Sign up with email, issue a key, and you\'re done.' },
          { q: 'Monthly vs annual?', a: 'Annual saves ~17% (2 months free). Both billed via Skydo as one-time payments during beta.' },
          { q: 'Is Pro recurring or one-time?', a: 'Currently one-time per cycle (manual fulfillment during beta). Auto-recurring billing arrives with Stripe in v1.3.' },
          { q: 'Can I self-host instead?', a: 'Yes — the CLI works fully with your own NVIDIA / OpenAI / Groq key (BYOK mode). Cloud is optional.' },
        ].map((item) => (
          <div key={item.q} className="border-b border-white/[0.06] pb-6">
            <div className="font-medium mb-1">{item.q}</div>
            <div className="text-sm text-muted">{item.a}</div>
          </div>
        ))}
      </section>

      <footer className="px-8 py-5 border-t border-white/[0.06] text-xs text-muted flex justify-between">
        <span>© 2026 SORK.cloud</span>
        <Link href="/" className="hover:text-fg transition-colors">Back to home</Link>
      </footer>
    </main>
  );
}
