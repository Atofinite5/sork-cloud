import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { licenseKeys, users } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export async function GET(): Promise<Response> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!userRows[0]) return Response.json({ keys: [] });

  const userId = userRows[0].id;

  const keys = await db
    .select({
      id: licenseKeys.id,
      name: licenseKeys.name,
      keyPrefix: licenseKeys.keyPrefix,
      lastUsedAt: licenseKeys.lastUsedAt,
      createdAt: licenseKeys.createdAt,
    })
    .from(licenseKeys)
    .where(and(eq(licenseKeys.userId, userId), isNull(licenseKeys.revokedAt)))
    .orderBy(licenseKeys.createdAt);

  return Response.json({ keys });
}
