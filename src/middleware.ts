import { NextResponse, type NextRequest } from 'next/server';

/**
 * Fast pre-check: protected pages need a session cookie to render at all. This is a convenience
 * redirect only. The cookie is cryptographically verified (with revocation checks) in the app layout
 * and in every API route, so a forged cookie value gets no access.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get('la_session')?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*', '/admin/:path*'] };
