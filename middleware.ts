import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Routes that require auth. Everything else (landing, /pricing, etc.) is public.
 *
 * /api/triage and /api/fix are excluded — they authenticate via license key
 * (Bearer token), not via Clerk session. See app/api/triage/route.ts (Session C).
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/license(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on all paths except Next internals and static files
    '/((?!_next|.*\\.(?:ico|png|jpg|jpeg|svg|webp|css|js|woff2?)).*)',
    '/(api|trpc)(.*)',
  ],
};
