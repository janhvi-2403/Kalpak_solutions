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

  // Check slug structure
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate)) {
    return null;
  }

  return candidate;
}

/**
 * Constructs a full URL for a tenant subdomain given the current base domain and port.
 */
export function buildTenantSubdomainUrl(subdomain: string, path = '/'): string {
  if (typeof window === 'undefined') {
    return path;
  }

  const { protocol, host, port } = window.location;
  const hostParts = host.split(':');
  const hostname = hostParts[0] || '';


  let targetHost = '';
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    targetHost = `${subdomain}.localhost${port ? `:${port}` : ''}`;
  } else if (hostname.endsWith('.lvh.me')) {
    targetHost = `${subdomain}.lvh.me${port ? `:${port}` : ''}`;
  } else {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      parts[0] = subdomain;
      targetHost = `${parts.join('.')}${port ? `:${port}` : ''}`;
    } else {
      targetHost = `${subdomain}.${hostname}${port ? `:${port}` : ''}`;
    }
  }

  return `${protocol}//${targetHost}${path.startsWith('/') ? path : `/${path}`}`;
}
