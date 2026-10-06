import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { getConfig } from '@kalpak/config';
import { RESERVED_SUBDOMAINS, TenantStatus } from '@kalpak/types';
import { logger } from '@kalpak/logger';

@Injectable()
export class SubdomainResolverService {
  private readonly config = getConfig();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates whether a candidate string is a valid tenant subdomain slug:
   * - 2 to 63 characters (RFC 1123 DNS label limits)
   * - Lowercase alphanumeric characters and hyphens only
   * - Cannot start or end with a hyphen
   * - Not a platform reserved name
   */
  isValidSubdomainSlug(candidate: string): boolean {
    if (!candidate || typeof candidate !== 'string') {
      return false;
    }
    const slug = candidate.trim().toLowerCase();
    if (slug.length < 2 || slug.length > 63) {
      return false;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return false;
    }
    return !this.isReserved(slug);
  }

  /**
   * Extracts subdomain from incoming request headers or hostname.
   */
  extractSubdomain(
    hostHeader?: string,
    forwardedHost?: string,
    tenantSlugHeader?: string,
    originHeader?: string
  ): string | null {
    // 1. Identify candidate raw host from forwarded host, host, or origin
    let rawHost = forwardedHost || hostHeader;
    if (!rawHost && originHeader) {
      try {
        const parsedUrl = new URL(originHeader);
        rawHost = parsedUrl.host;
      } catch {
        // Ignore URL parse error
      }
    }

    if (rawHost && typeof rawHost === 'string') {
      // Remove port and convert to lowercase
      const hostParts = rawHost.split(':');
      const hostname = (hostParts[0] || '').trim().toLowerCase();

      // Skip IP addresses (IPv4 or IPv6), plain localhost, or loopback
      const isIpOrLocal =
        /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
        hostname === 'localhost' ||
        hostname === '::1';

      if (!isIpOrLocal) {
        const baseDomain = this.config.APP_BASE_DOMAIN?.toLowerCase() || 'kalpaksolutions.com';
        let candidate: string | null = null;

        // Match against localhost / lvh.me patterns (e.g. acme.localhost, acme.lvh.me)
        if (hostname.endsWith('.localhost')) {
          const parts = hostname.replace(/\.localhost$/, '').split('.');
          candidate = parts[parts.length - 1] || null;
        } else if (hostname.endsWith('.lvh.me')) {
          const parts = hostname.replace(/\.lvh\.me$/, '').split('.');
          candidate = parts[parts.length - 1] || null;
        } else if (hostname.endsWith('.kalpaksolutions.com')) {
          // Explicit production custom domain match (e.g. acme.kalpaksolutions.com)
          const prefix = hostname.slice(0, -'.kalpaksolutions.com'.length);
          const parts = prefix.split('.');
          candidate = parts[parts.length - 1] || null;
        } else if (baseDomain && baseDomain !== 'localhost' && hostname.endsWith(`.${baseDomain}`)) {
          // Match against configured base domain (e.g. acme.kalpaksolutions.com)
          const prefix = hostname.slice(0, -(baseDomain.length + 1));
          const parts = prefix.split('.');
          candidate = parts[parts.length - 1] || null;
        } else if (hostname.endsWith('.onrender.com')) {
          const parts = hostname.replace(/\.onrender\.com$/, '').split('.');
          candidate = parts.length > 1 ? (parts[0] ?? null) : null;
        } else {
          // Generic multi-level subdomain detection (e.g. acme.kalpaksolutions.com)
          const parts = hostname.split('.');
          if (parts.length >= 3) {
            candidate = parts[0] || null;
          }
        }

        if (candidate && this.isValidSubdomainSlug(candidate)) {
          return candidate.toLowerCase();
        }
      }
    }

    // 2. Fallback to explicit tenant slug header if provided by proxy (e.g. Next.js middleware)
    if (tenantSlugHeader && typeof tenantSlugHeader === 'string') {
      const slug = tenantSlugHeader.trim().toLowerCase();
      if (this.isValidSubdomainSlug(slug)) {
        return slug;
      }
    }

    return null;
  }

  /**
   * Checks if a subdomain is reserved by the platform.
   */
  isReserved(slug: string): boolean {
    return RESERVED_SUBDOMAINS.includes(slug.toLowerCase() as any);
  }

  /**
   * Resolves a Tenant record by its subdomain slug.
   */
  async resolveTenantBySubdomain(subdomain: string) {
    if (!subdomain || this.isReserved(subdomain)) {
      return null;
    }

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: subdomain.toLowerCase() },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          settings: true,
          createdAt: true,
          deletedAt: true,
        },
      });

      if (!tenant || tenant.deletedAt !== null || tenant.status === TenantStatus.CANCELLED) {
        return null;
      }

      return tenant;
    } catch (err) {
      logger.error({ err, subdomain }, 'Error resolving tenant by subdomain');
      return null;
    }
  }

  /**
   * Helper to extract subdomain and resolve tenant directly from a request.
   */
  async resolveFromRequest(req: any) {
    const host = req.headers?.host;
    const forwardedHost = req.headers?.['x-forwarded-host'];
    const tenantSlug = req.headers?.['x-tenant-slug'];
    const origin = req.headers?.origin;

    const subdomain = this.extractSubdomain(host, forwardedHost, tenantSlug, origin);
    if (!subdomain) {
      return { subdomain: null, tenant: null };
    }

    const tenant = await this.resolveTenantBySubdomain(subdomain);
    return { subdomain, tenant };
  }
}
