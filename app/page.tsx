import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">

      {/* ─── Header ─────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-1 font-mono text-base font-semibold tracking-tight select-none">
          <span className="text-fg">SORK</span>
          <span className="text-accent">.cloud</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/pricing" className="text-muted hover:text-fg transition-colors px-3 py-1.5 hidden sm:block">
            Pricing
          </Link>
          <SignedOut>
            <Link
              href="/sign-in"
              className="text-muted hover:text-fg transition-colors px-3 py-1.5"
            >
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
            <UserButton  />
          </SignedIn>
        </nav>
      </header>

      {/* ─── Hero ───────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-0">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs text-accent mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          v1.2.0 — AST scanner live
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
          AI security pipeline<br />
          <span className="text-muted">for Node.js</span>
        </h1>

        <p className="mt-6 text-muted max-w-lg text-base leading-relaxed">
          Scan, triage, fix, and verify vulnerabilities in your codebase.
          AST-based detection. AI-powered fixes. Zero false positives on your own source.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <SignedOut>
            <Link
              href="/sign-up"
              className="rounded-lg bg-fg text-bg px-6 py-2.5 font-semibold text-sm hover:bg-fg/90 transition-colors"
            >
              Get started — free
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="rounded-lg bg-fg text-bg px-6 py-2.5 font-semibold text-sm hover:bg-fg/90 transition-colors"
            >
              Open dashboard
            </Link>
          </SignedIn>
          <a
            href="https://www.npmjs.com/package/sork-queb"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/10 px-6 py-2.5 text-sm text-muted hover:text-fg hover:border-white/20 transition-colors font-mono"
          >
            npm i -g sork-queb
          </a>
        </div>

        {/* CLI preview */}
        <div className="mt-14 w-full max-w-lg rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden text-left">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <span className="h-3 w-3 rounded-full bg-red-500/70"></span>
            <span className="h-3 w-3 rounded-full bg-yellow-500/70"></span>
            <span className="h-3 w-3 rounded-full bg-green-500/70"></span>
            <span className="ml-2 text-xs text-muted font-mono">terminal</span>
          </div>
          <pre className="p-4 text-xs font-mono leading-relaxed text-neutral-300">
            <span className="text-muted">$ </span>
            <span className="text-accent">sork</span>
            {' config set-key sork_live_xxx\n'}
            <span className="text-green-400">✓</span>
            {' API key saved\n\n'}
            <span className="text-muted">$ </span>
            <span className="text-accent">sork</span>
            {' scan\n'}
            <span className="text-green-400">✓</span>
            {' 0 vulnerabilities detected'}
          </pre>
        </div>

        {/* Stats strip */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-center max-w-sm w-full">
          {[
            { value: '6', label: 'vuln types' },
            { value: '0', label: 'false positives' },
            { value: 'MIT', label: 'open source' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-fg">{s.value}</div>
              <div className="text-xs text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="px-8 py-5 border-t border-white/[0.06] text-xs text-muted flex justify-between items-center">
        <span>© 2026 SORK.cloud · by Bhargav Kalambhe</span>
        <div className="flex gap-4">
          <a
            href="https://github.com/Atofinite5"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/sork-queb"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg transition-colors"
          >
            npm
          </a>
        </div>
      </footer>
    </main>
  );
}
