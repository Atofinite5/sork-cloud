/**
 * Admin gate. ADMIN_USER_IDS is a comma-separated list of Clerk user IDs
 * (e.g.,  user_2abcXXX...) — only these users can call admin endpoints.
 *
 * Find your Clerk ID:  /dashboard → Account section → Clerk ID
 */
export function isAdmin(clerkUserId: string | null | undefined): boolean {
  if (!clerkUserId) return false;
  const ids = (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(clerkUserId);
}
