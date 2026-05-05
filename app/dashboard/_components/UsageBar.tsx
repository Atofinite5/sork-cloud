'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface QuotaResponse {
  plan: 'free' | 'pro' | 'pro_plus';
  limit: number | 'unlimited';
  used: number;
  remaining: number | 'unlimited';
  exhausted: boolean;
  unlimited: boolean;
}

export function UsageBar() {
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json() as Promise<QuotaResponse>)
      .then(setQuota)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 animate-pulse h-24" />
    );
  }

  if (!quota) return null;

  if (quota.unlimited) {
    return (
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-accent uppercase tracking-widest mb-1">Usage</div>
            <div className="text-lg font-semibold">Unlimited requests</div>
            <p className="text-xs text-muted mt-1">
              {quota.plan === 'pro_plus' ? 'Pro Plus plan' : 'Pro plan'} · no caps
            </p>
          </div>
          <div className="text-3xl">∞</div>
        </div>
      </div>
    );
  }

  // Free plan — show progress bar
  const limit = typeof quota.limit === 'number' ? quota.limit : 14;
  const remaining = typeof quota.remaining === 'number' ? quota.remaining : 0;
  const pct = Math.min(100, Math.round((quota.used / limit) * 100));
  const danger = quota.used >= limit;
  const warning = !danger && remaining <= 3;

  return (
    <div
      className={[
        'rounded-xl border p-5 space-y-3',
        danger ? 'border-red-500/30 bg-red-500/5' : warning ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10 bg-white/[0.02]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted uppercase tracking-widest">Free trial</div>
        <div className="text-xs font-mono text-muted">
          {quota.used} / {limit}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={[
            'h-full transition-all duration-500',
            danger ? 'bg-red-500' : warning ? 'bg-yellow-500' : 'bg-accent',
          ].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>

      {danger ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-red-300">
            Free trial exhausted. Upgrade to keep scanning.
          </p>
          <Link
            href="/pricing"
            className="shrink-0 rounded-lg bg-red-500 text-white font-semibold px-4 py-1.5 text-sm hover:bg-red-400 transition-colors"
          >
            Upgrade →
          </Link>
        </div>
      ) : warning ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-yellow-300">
            {remaining} request{remaining === 1 ? '' : 's'} left.
          </p>
          <Link
            href="/pricing"
            className="shrink-0 rounded-lg bg-yellow-500/20 text-yellow-300 font-semibold px-4 py-1.5 text-sm hover:bg-yellow-500/30 transition-colors"
          >
            Upgrade
          </Link>
        </div>
      ) : (
        <p className="text-xs text-muted">
          {remaining} of {limit} free requests remaining (lifetime).
        </p>
      )}
    </div>
  );
}
