import { RESERVED_SUBDOMAINS } from '@kalpak/types';

/**
 * Extracts tenant subdomain from a given hostname or current window location.
 */
export function getTenantSubdomain(hostname?: string): string | null {
  let host = hostname;
  if (!host && typeof window !== 'undefined') {
    host = window.location.hostname;
  }

  if (!host || typeof host !== 'string') {
    return null;
  }

  // Remove port if present and convert to lowercase
  const hostParts = host.split(':');
  const cleanHost = (hostParts[0] || '').trim().toLowerCase();

  // If IP address or plain localhost, return null
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost === 'localhost' || cleanHost === '::1') {
    return null;
  }

  let candidate: string | null = null;

  if (cleanHost.endsWith('.localhost')) {
    const parts = cleanHost.replace(/\.localhost$/, '').split('.');
    candidate = parts[parts.length - 1] || null;
  } else if (cleanHost.endsWith('.lvh.me')) {
    const parts = cleanHost.replace(/\.lvh\.me$/, '').split('.');
    candidate = parts[parts.length - 1] || null;
  } else if (cleanHost.endsWith('.kalpaksolutions.com')) {
    const prefix = cleanHost.slice(0, -'.kalpaksolutions.com'.length);
    const parts = prefix.split('.');
    candidate = parts[parts.length - 1] || null;
  } else if (cleanHost.endsWith('.onrender.com')) {
    const parts = cleanHost.replace(/\.onrender\.com$/, '').split('.');
    candidate = parts.length > 1 ? (parts[0] ?? null) : null;
  } else {
    // General domain e.g. acme.kalpak.com or acme.platform.co.uk
    const parts = cleanHost.split('.');
    if (parts.length >= 3) {
      candidate = parts[0] || null;
    }
  }

  if (!candidate) {
    return null;
  }

  // Check if reserved
  if (RESERVED_SUBDOMAINS.includes(candidate as any)) {
    return null;
  }

  // Check slug structure and RFC 1123 length
  if (candidate.length < 2 || candidate.length > 63 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate)) {
    return null;
  }

  return candidate;
}

/**
 * Constructs a full URL for a tenant subdomain given the current base domain and port.
 */
export function buildTenantSubdomainUrl(subdomain: string, path = '/'): string {
  let cleanPath = path || '/';
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    try {
      const parsed = new URL(cleanPath);
      cleanPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      cleanPath = '/';
    }
  }
  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  if (typeof window === 'undefined') {
    return cleanPath;
  }

  const { protocol, host, port } = window.location;
  const hostParts = host.split(':');
  const hostname = hostParts[0] || '';

  // Render's shared staging domain (*.onrender.com) does not support wildcard customer subdomains
  // (e.g. dfjkerf.onrender.com will fail with 404 Not Found from Render's edge router).
  // When browsing on kalpak-web.onrender.com, stay on kalpak-web.onrender.com with clean relative path.
  if (hostname.endsWith('.onrender.com')) {
    return cleanPath;
  }

  // If accessing directly by IP (e.g. 127.0.0.1 or server loopback), preserve host without mangling
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === '::1') {
    return cleanPath;
  }

  let targetHost = '';
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    targetHost = `${subdomain}.localhost${port ? `:${port}` : ''}`;
  } else if (hostname.endsWith('.lvh.me')) {
    targetHost = `${subdomain}.lvh.me${port ? `:${port}` : ''}`;
  } else if (hostname.endsWith('kalpaksolutions.com')) {
    targetHost = `${subdomain}.kalpaksolutions.com${port ? `:${port}` : ''}`;
  } else {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      parts[0] = subdomain;
      targetHost = `${parts.join('.')}${port ? `:${port}` : ''}`;
    } else {
      targetHost = `${subdomain}.${hostname}${port ? `:${port}` : ''}`;
    }
  }

  return `${protocol}//${targetHost}${cleanPath}`;
}

/**
 * Determines the authoritative default dashboard route for a given user role.
 */
export function getDefaultDashboardForRole(
  role?: string | null,
  isSuperAdmin = false,
  tenantSlug?: string | null
): string {
  if (isSuperAdmin || role === 'SUPER_ADMIN') {
    return '/super-admin/dashboard';
  }

  switch (role) {
    case 'DEPARTMENT_ADMIN':
      return '/dashboard/department';
    case 'SUPPORT_EMPLOYEE':
      return '/dashboard/employee';
    case 'CUSTOMER':
      return tenantSlug ? `/portal/${tenantSlug}/dashboard` : '/dashboard';
    case 'CLIENT_ADMIN':
    default:
      return '/dashboard';
  }
}

/**
 * Sanitizes and validates a candidate redirect URL (e.g. from returnUrl query parameter).
 *
 * Security & Environment Rules:
 * 1. Must never allow open redirects to arbitrary external origins.
 * 2. Must never allow cross-environment leaks (e.g. localhost URL passed into production,
 *    or production URL passed into localhost).
 * 3. Must reject dangerous schemes, protocol-relative prefixes (//), and backslashes (\).
 * 4. Must reject auth loops (e.g. /login, /logout, /signup).
 * 5. Returns defaultDest if candidate is invalid, unsafe, or cross-origin.
 */
export function sanitizeReturnUrl(rawUrl: string | null | undefined, defaultDest: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return defaultDest;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return defaultDest;
  }

  // Reject protocol-relative URLs (//evil.com or //localhost) and backslash evasion
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\')) {
    return defaultDest;
  }

  // If candidate is a root-relative application path
  if (trimmed.startsWith('/')) {
    const withoutQuery = trimmed.split('?')[0] ?? '';
    const pathOnly = (withoutQuery.split('#')[0] ?? '').toLowerCase();
    // Prevent redirect loops back to auth pages
    if (pathOnly === '/login' || pathOnly === '/logout' || pathOnly === '/signup') {
      return defaultDest;
    }
    return trimmed;
  }

  // If candidate is an absolute URL (http:// or https://)
  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(trimmed);
      // STRICT SAME-ORIGIN CHECK:
      // When on production (e.g. kalpak-web.onrender.com), parsed.origin must match window.location.origin.
      // An absolute http://localhost:3000/... will NOT match window.location.origin and is safely rejected.
      if (parsed.origin === window.location.origin) {
        const pathOnly = parsed.pathname.toLowerCase();
        if (pathOnly === '/login' || pathOnly === '/logout' || pathOnly === '/signup') {
          return defaultDest;
        }
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // Malformed URL
      return defaultDest;
    }
  }

  // Fallback for non-relative or unverified destinations
  return defaultDest;
}
