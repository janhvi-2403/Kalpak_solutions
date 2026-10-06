import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RESERVED_SUBDOMAINS } from '@kalpak/types';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostParts = host.split(':');
  const cleanHost = (hostParts[0] || '').trim().toLowerCase();

  // Skip IP addresses, plain localhost, and loopback
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost === 'localhost' || cleanHost === '::1') {
    return NextResponse.next();
  }

  let candidate: string | null = null;

  if (cleanHost.endsWith('.localhost')) {
    const parts = cleanHost.replace(/\.localhost$/, '').split('.');
    candidate = parts[parts.length - 1] || null;
  } else if (cleanHost.endsWith('.lvh.me')) {
    const parts = cleanHost.replace(/\.lvh\.me$/, '').split('.');
    candidate = parts[parts.length - 1] || null;
  } else {
    const parts = cleanHost.split('.');
    if (parts.length >= 3) {
      candidate = parts[0] || null;
    }
  }

  // Clone headers so downstream server components can inspect tenant context
  const requestHeaders = new Headers(request.headers);

  if (candidate && !RESERVED_SUBDOMAINS.includes(candidate as any) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate)) {
    requestHeaders.set('x-tenant-slug', candidate);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, svgs, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
