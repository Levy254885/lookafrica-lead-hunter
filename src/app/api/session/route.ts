import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { parseJson, errorResponse } from '@/lib/api';
import { Errors } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/auth/session';
import { ensureUserDoc } from '@/lib/users';
import { log } from '@/lib/logger';

const schema = z.object({ idToken: z.string().min(20).max(4096), displayName: z.string().max(80).optional() });

/** Exchanges a fresh Firebase ID token for an HTTP-only session cookie. */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    await rateLimit(`session:${ip}`, 30, 300);
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    if (!origin || !host || new URL(origin).host !== host) throw Errors.forbidden('Cross-origin request rejected.');
    const { idToken, displayName } = await parseJson(req, schema);
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    // Only accept tokens minted in the last 5 minutes, so a stolen old token cannot start a session.
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) throw Errors.unauthenticated();
    const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    await ensureUserDoc(
      { uid: decoded.uid, email: decoded.email ?? null, emailVerified: decoded.email_verified === true, isAdmin: false, authTimeSec: decoded.auth_time },
      displayName,
    );
    const res = NextResponse.json({ ok: true, emailVerified: decoded.email_verified === true });
    res.cookies.set(SESSION_COOKIE, cookie, {
      maxAge: SESSION_MAX_AGE_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    // Only genuine "bad or expired token" errors count as unauthenticated. Anything else is a server
    // configuration problem (credentials, Firestore not created) and is logged for the operator.
    if (/^auth\/(id-token-expired|id-token-revoked|argument-error|invalid-id-token|user-disabled|user-not-found)$/.test(code) && !(err as { status?: number }).status) {
      log('warn', 'session_token_rejected', { code });
      return errorResponse(Errors.unauthenticated());
    }
    return errorResponse(err);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
