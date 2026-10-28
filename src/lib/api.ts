import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type z } from 'zod';
import { verifySession } from '@/lib/auth/session';
import { ApiError, Errors } from '@/lib/errors';
import { errorFields, log } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import type { SessionUser } from '@/lib/types';

type AuthMode = 'none' | 'user' | 'verified' | 'admin';

interface RouteOptions {
  auth?: AuthMode;
  rate?: { name: string; limit: number; windowSec: number };
}

interface RouteContext<P> {
  req: NextRequest;
  user: SessionUser;
  params: P;
}

/**
 * CSRF defence for cookie-authenticated mutations: the Origin header must match the host the
 * request was sent to. SameSite=Lax on the session cookie is the second layer.
 */
function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host) throw Errors.forbidden('Missing origin.');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw Errors.forbidden('Invalid origin.');
  }
  if (originHost !== host) throw Errors.forbidden('Cross-origin request rejected.');
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'invalid_request',
          message: 'Some fields are invalid.',
          details: err.issues.slice(0, 10).map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
      { status: 400 },
    );
  }
  log('error', 'unhandled_route_error', errorFields(err));
  return NextResponse.json(
    { error: { code: 'internal_error', message: 'Something went wrong on our side. Please try again.' } },
    { status: 500 },
  );
}

/**
 * Wraps a route handler with authentication, same-origin checks, optional rate limiting and
 * uniform error responses. The authenticated user is injected; handlers never read a user id
 * from the request body or query string.
 */
export function route<P = Record<string, never>>(
  opts: RouteOptions,
  handler: (ctx: RouteContext<P>) => Promise<Response | Record<string, unknown>>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }): Promise<Response> => {
    try {
      const auth = opts.auth ?? 'user';
      let user: SessionUser | null = null;
      if (auth !== 'none') {
        if (req.method !== 'GET' && req.method !== 'HEAD') assertSameOrigin(req);
        user = await verifySession();
        if (!user) throw Errors.unauthenticated();
        if (auth === 'admin' && !user.isAdmin) throw Errors.forbidden();
        if (auth === 'verified' && !user.emailVerified) {
          throw new ApiError(403, 'email_not_verified', 'Verify your email address to use this feature.');
        }
        if (opts.rate) await rateLimit(`${opts.rate.name}:${user.uid}`, opts.rate.limit, opts.rate.windowSec);
      }
      const params = (context?.params ? await context.params : {}) as P;
      const result = await handler({ req, user: user as SessionUser, params });
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function parseJson<S extends z.ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw Errors.badRequest('Request body must be valid JSON.');
  }
  return schema.parse(raw);
}

/** Authorizes scheduled-job endpoints with a shared secret (Vercel Cron sends it as a Bearer token). */
export function assertCronAuth(req: NextRequest): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw Errors.unavailable('cron_not_configured', 'CRON_SECRET is not configured.');
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw Errors.unauthenticated();
}
