import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  decimal,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
]);

export const planEnum = pgEnum('plan', ['free', 'pro', 'pro_plus']);

export const endpointEnum = pgEnum('endpoint', ['triage', 'fix']);

export const usageStatusEnum = pgEnum('usage_status', ['ok', 'rate_limited', 'error']);

// ─── Tables ───────────────────────────────────────────────────────

/**
 * One row per Clerk user. Synced via /api/webhooks/clerk on user.created.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index('users_email_idx').on(t.email),
  }),
);

/**
 * Stripe subscription state. One per user (we treat this as 1:1 even though
 * Stripe allows multiple — simpler billing model).
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    status: subscriptionStatusEnum('status').notNull(),
    plan: planEnum('plan').notNull().default('free'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('subscriptions_user_idx').on(t.userId),
    customerIdx: index('subscriptions_customer_idx').on(t.stripeCustomerId),
  }),
);

/**
 * License keys the user pastes into the SORK CLI.
 * Format: sork_live_<32-char-random>
 *
 * We store ONLY a SHA-256 hash. The plaintext is shown to the user
 * exactly once at issue time, then never again.
 */
export const licenseKeys = pgTable(
  'license_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(), // first 14 chars, e.g. "sork_live_a1b2"
    name: text('name').notNull().default('Default'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('license_keys_user_idx').on(t.userId),
    hashIdx: uniqueIndex('license_keys_hash_idx').on(t.keyHash),
  }),
);

/**
 * Append-only log of every AI call. Used for usage display and rate limiting.
 */
export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    licenseKeyId: uuid('license_key_id')
      .notNull()
      .references(() => licenseKeys.id, { onDelete: 'cascade' }),
    endpoint: endpointEnum('endpoint').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costUsd: decimal('cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
    status: usageStatusEnum('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('usage_events_user_idx').on(t.userId),
    createdIdx: index('usage_events_created_idx').on(t.createdAt),
  }),
);

// ─── Inferred types (use these in app code) ────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type LicenseKey = typeof licenseKeys.$inferSelect;
export type NewLicenseKey = typeof licenseKeys.$inferInsert;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
