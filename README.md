# SORK Cloud

Managed backend for the [SORK CLI](https://www.npmjs.com/package/sork-queb).

Provides:
- User accounts (Clerk)
- License key issuance and revocation
- Server-side AI proxy (NVIDIA / Cohere keys never touch the client)
- Subscription billing (Stripe — Session E)

This is the **paid tier**. The CLI continues to work standalone with BYOK; this backend is only used when a user pastes a `sork_live_*` license key.

---

## Status

| Session | What it builds | State |
|---|---|---|
| A | Next.js scaffold + Neon DB + schema + Clerk auth | ✅ done |
| B | `/dashboard` (key, usage, plan), `/api/license/*` | pending |
| C | `/api/triage` and `/api/fix` AI proxy | pending |
| D | CLI changes — talk to backend when key is `sork_live_*` | pending |
| E | Stripe / Razorpay checkout + webhooks | pending |
| F | Email (Resend), monitoring (Sentry), abuse limits | pending |

---

## Local setup

### 1. Install deps

```bash
cd sork-cloud
npm install
```

### 2. Create accounts (free tiers)

| Service | Why | Sign up |
|---|---|---|
| **Neon** | Serverless Postgres | https://neon.tech |
| **Clerk** | Auth (sign up, sign in, sessions) | https://clerk.com |

### 3. Fill in `.env.local`

```bash
cp .env.example .env.local
```

Then open `.env.local` and paste real values for:

- `DATABASE_URL` — from Neon → your project → Connection details → "Pooled connection"
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk dashboard → API keys
- `CLERK_SECRET_KEY` — same place
- `CLERK_WEBHOOK_SECRET` — Clerk dashboard → Webhooks (set up in step 5)

Other values can be left blank for now (they're for later sessions).

### 4. Push the DB schema

```bash
npm run db:push
```

This creates the `users`, `subscriptions`, `license_keys`, `usage_events` tables in your Neon DB.

Verify with:

```bash
npm run db:studio
```

Opens a local web UI at `https://local.drizzle.studio` showing your tables (empty for now).

### 5. Wire the Clerk webhook

Clerk needs to notify our backend when a user signs up so we can sync to our `users` table.

For local dev, use **ngrok** (or Clerk's built-in webhook tester):

```bash
# In another terminal
npx ngrok http 3000
```

Take the `https://xxxxx.ngrok.io` URL. Then in Clerk dashboard:

1. Webhooks → Add endpoint
2. URL: `https://xxxxx.ngrok.io/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret → paste into `CLERK_WEBHOOK_SECRET` in `.env.local`

(In production, replace ngrok URL with `https://sork.dev/api/webhooks/clerk`.)

### 6. Run

```bash
npm run dev
```

Open http://localhost:3000 — landing page should load. Click "Sign up" → create an account → you should land on `/dashboard`. Check Drizzle Studio: there should be one row in `users`.

---

## Project layout

```
sork-cloud/
├── app/
│   ├── layout.tsx                  Root, wraps everything in <ClerkProvider>
│   ├── page.tsx                    Public landing
│   ├── globals.css                 Tailwind + base styles
│   ├── sign-in/[[...sign-in]]/     Clerk's hosted sign-in
│   ├── sign-up/[[...sign-up]]/     Clerk's hosted sign-up
│   ├── dashboard/
│   │   └── page.tsx                Gated. Shows email; full UI in Session B.
│   └── api/
│       └── webhooks/
│           └── clerk/route.ts      Syncs user.created/updated/deleted to our DB
├── lib/
│   └── db/
│       ├── schema.ts               Drizzle tables: users, subscriptions, license_keys, usage_events
│       └── index.ts                Neon client + Drizzle instance (import as `db`)
├── middleware.ts                   Clerk route protection (gates /dashboard, /api/license/*)
├── drizzle.config.ts               Drizzle Kit config
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
├── package.json
├── .env.example                    Template (commit this)
└── .env.local                      Real values (gitignored)
```

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript strict check, no emit |
| `npm run db:generate` | Generate SQL migrations from schema.ts |
| `npm run db:push` | Push schema directly to Neon (skip migrations — fine for early dev) |
| `npm run db:studio` | Drizzle Studio — visual DB browser |

---

## What's intentionally NOT here yet

- No `/api/triage` or `/api/fix` (Session C — that's where AI keys come in)
- No license-key issuance UI (Session B)
- No Stripe checkout (Session E)
- No emails (Session F)
- No production deploy config — runs locally only until secrets are properly handled

This is on purpose. Each session is a verifiable checkpoint.
