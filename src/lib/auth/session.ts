import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '@/lib/firebase/admin';
import type { SessionUser } from '@/lib/types';

export const SESSION_COOKIE = 'la_session';
/** Session cookie lifetime. Firebase allows 5 minutes to 2 weeks. */
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Verifies the session cookie with the Admin SDK, including revocation checks.
 * The user id always comes from the verified cookie, never from request input.
 */
export async function verifySession(): Promise<SessionUser | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(value, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      // Admin status comes only from a custom claim set by trusted tooling (scripts/set-admin.ts).
      isAdmin: decoded.admin === true,
      authTimeSec: decoded.auth_time,
    };
  } catch {
    return null;
  }
}

/** For server components and layouts: redirect to sign-in when there is no valid session. */
export async function requireUserPage(): Promise<SessionUser> {
  const user = await verifySession();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requireUserPage();
  if (!user.isAdmin) redirect('/app');
  return user;
}
