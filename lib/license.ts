import crypto from 'crypto';

export const KEY_PREFIX = 'sork_live_';
export const KEY_DISPLAY_LENGTH = 14; // "sork_live_a1b2"

/** Generate a new plaintext license key. Shown to the user exactly once. */
export function generateLicenseKey(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(24).toString('hex')}`;
}

/** SHA-256 hash of a key. Only this is stored in the DB — never the plaintext. */
export function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** First N chars of the key, safe to display in UI. */
export function keyPrefix(key: string): string {
  return key.slice(0, KEY_DISPLAY_LENGTH);
}

export function isCloudKey(key: string): boolean {
  return key.startsWith(KEY_PREFIX);
}
