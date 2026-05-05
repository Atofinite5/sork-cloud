import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { licenseKeys, users } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!userRows[0]) return Response.json({ error: 'User not found' }, { status: 404 });
  const userId = userRows[0].id;

  // Only revoke if the key belongs to this user
  const result = await db
    .update(licenseKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(licenseKeys.id, id), eq(licenseKeys.userId, userId)))
    .returning({ id: licenseKeys.id });

  if (!result[0]) {
    return Response.json({ error: 'Key not found or already revoked' }, { status: 404 });
  }

  return Response.json({ revoked: true });
}
