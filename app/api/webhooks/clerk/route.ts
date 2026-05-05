import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id?: string;
  };
  type: 'user.created' | 'user.updated' | 'user.deleted';
}

/**
 * Webhook handler for Clerk user events.
 *
 * Setup (one-time):
 *   1. Clerk dashboard → Webhooks → Add endpoint
 *   2. URL: https://<your-domain>/api/webhooks/clerk
 *   3. Subscribe to: user.created, user.updated, user.deleted
 *   4. Copy the signing secret → CLERK_WEBHOOK_SECRET in .env.local
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response('CLERK_WEBHOOK_SECRET not configured', { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return new Response('Signature verification failed', { status: 401 });
  }

  const { id, email_addresses, primary_email_address_id } = event.data;
  const email =
    email_addresses.find((e) => e.id === primary_email_address_id)?.email_address ??
    email_addresses[0]?.email_address;

  if (!email) {
    return new Response('No email on user', { status: 400 });
  }

  switch (event.type) {
  case 'user.created':
    await db.insert(users).values({ clerkId: id, email }).onConflictDoNothing();
    break;

  case 'user.updated':
    await db
      .update(users)
      .set({ email, updatedAt: new Date() })
      .where(eq(users.clerkId, id));
    break;

  case 'user.deleted':
    await db.delete(users).where(eq(users.clerkId, id));
    break;
  }

  return new Response('ok', { status: 200 });
}
