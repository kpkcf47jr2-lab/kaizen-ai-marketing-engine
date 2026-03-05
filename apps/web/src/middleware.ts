import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

/**
 * Middleware — protects /dashboard/* and /api/* routes (except auth & health).
 * Also adds security headers (Strict-Transport-Security for HTTPS in prod).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Skip public paths ──
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon');

  if (isPublic) {
    return NextResponse.next();
  }

  // ── Auth check for /dashboard and /api routes ──
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Admin-only routes ──
  if (pathname.startsWith('/dashboard/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  const response = NextResponse.next();

  // ── HSTS header (only meaningful over HTTPS in production) ──
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
