import { db } from '@/lib/db';
import { licenseKeys } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { hashKey, isCloudKey } from '@/lib/license';

export interface ValidatedLicense {
  userId: string;
  licenseKeyId: string;
}

/**
 * Validate a Bearer license key from an Authorization header.
 * Returns null on any failure — caller should return 401.
 *
 * Also bumps lastUsedAt on success.
 */
export async function validateLicenseKey(
  authHeader: string | null,
): Promise<ValidatedLicense | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const key = authHeader.slice(7).trim();
  if (!isCloudKey(key)) return null;

  const hash = hashKey(key);

  const rows = await db
    .select({ userId: licenseKeys.userId, id: licenseKeys.id })
    .from(licenseKeys)
    .where(and(eq(licenseKeys.keyHash, hash), isNull(licenseKeys.revokedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Fire-and-forget lastUsedAt update
  void db
    .update(licenseKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(licenseKeys.id, row.id));

  return { userId: row.userId, licenseKeyId: row.id };
}
