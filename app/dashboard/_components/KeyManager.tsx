'use client';

import { useState, useEffect, useCallback } from 'react';

interface LicenseKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function KeyManager() {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/license/list');
      const data = await res.json() as { keys: LicenseKey[] };
      setKeys(data.keys ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchKeys(); }, [fetchKeys]);

  async function issueKey() {
    setIssuing(true);
    setIssueError(null);
    try {
      const res = await fetch('/api/license/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Default' }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        setIssueError(errBody.error ?? `Failed to issue key (HTTP ${res.status})`);
        return;
      }

      const data = await res.json() as { key: string };
      setNewKey(data.key);
      setShowNameInput(false);
      setNewKeyName('');
      await fetchKeys();
    } finally {
      setIssuing(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this key? Any CLI using it will stop working immediately.')) return;
    await fetch(`/api/license/revoke/${id}`, { method: 'DELETE' });
    await fetchKeys();
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">

      {/* One-time key reveal */}
      {newKey && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-green-400">
              Key issued — copy it now. It won&apos;t be shown again.
            </p>
            <button
              onClick={() => setNewKey(null)}
              className="text-muted hover:text-fg text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs font-mono text-green-300 truncate">
              {newKey}
            </code>
            <button
              onClick={() => copyKey(newKey)}
              className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
            >
              {copied ? '✓ copied' : 'copy'}
            </button>
          </div>
          <p className="text-xs text-muted">
            Run: <code className="font-mono text-accent">sork config set-key {newKey}</code>
          </p>
        </div>
      )}

      {/* Error banner */}
      {issueError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start justify-between gap-3">
          <div className="text-sm text-red-300">{issueError}</div>
          <button
            onClick={() => setIssueError(null)}
            className="text-muted hover:text-fg text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Issue new key */}
      {showNameInput ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void issueKey()}
            placeholder="Key name (e.g. Macbook Pro)"
            className="flex-1 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-accent focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => void issueKey()}
            disabled={issuing}
            className="rounded-lg bg-accent text-black font-semibold px-4 py-2 text-sm hover:bg-cyan-300 disabled:opacity-50 transition-colors"
          >
            {issuing ? 'Issuing…' : 'Issue'}
          </button>
          <button
            onClick={() => setShowNameInput(false)}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted hover:text-fg transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNameInput(true)}
          className="rounded-lg bg-accent text-black font-semibold px-4 py-2 text-sm hover:bg-cyan-300 transition-colors"
        >
          + Issue new key
        </button>
      )}

      {/* Key list */}
      {loading ? (
        <div className="text-sm text-muted py-4">Loading…</div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center">
          <p className="text-sm text-muted">No keys yet. Issue one above.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/[0.06]">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-5 py-4 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
              <div className="space-y-0.5 min-w-0">
                <div className="font-medium text-sm truncate">{k.name}</div>
                <div className="text-xs font-mono text-muted">{k.keyPrefix}…</div>
                <div className="text-xs text-muted">
                  {k.lastUsedAt
                    ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                    : `Created ${new Date(k.createdAt).toLocaleDateString()} · never used`}
                </div>
              </div>
              <button
                onClick={() => void revokeKey(k.id)}
                className="ml-4 shrink-0 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
