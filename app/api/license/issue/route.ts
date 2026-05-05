import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { licenseKeys, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateLicenseKey, hashKey, keyPrefix } from '@/lib/license';
import { canIssueKey } from '@/lib/quota';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().min(1).max(50).default('Default'),
});

export async function POST(req: Request): Promise<Response> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!userRows[0]) {
    return Response.json({ error: 'User not found — try again in a moment' }, { status: 404 });
  }

  const userId = userRows[0].id;

  // Enforce keysAllowed based on plan
  const check = await canIssueKey(userId);
  if (!check.allowed) {
    return Response.json(
      {
        error: check.reason,
        upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/pricing`,
      },
      { status: 402 },
    );
  }

  let name = 'Default';
  try {
    const body = await req.json();
    name = bodySchema.parse(body).name;
  } catch {
    // body is optional — use default
  }

  const plaintext = generateLicenseKey();
  const hash = hashKey(plaintext);
  const prefix = keyPrefix(plaintext);

  const [row] = await db
    .insert(licenseKeys)
    .values({ userId, keyHash: hash, keyPrefix: prefix, name })
    .returning({ id: licenseKeys.id, createdAt: licenseKeys.createdAt });

  return Response.json({
    id: row.id,
    key: plaintext, // shown to user this one time
    prefix,
    name,
    createdAt: row.createdAt,
  });
}
