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
   * Extracts subdomain from incoming request headers or hostname.
   */
  extractSubdomain(
    hostHeader?: string,
    forwardedHost?: string,
    tenantSlugHeader?: string,
    originHeader?: string
  ): string | null {
    // 1. Explicit tenant slug header takes immediate precedence if provided
    if (tenantSlugHeader && typeof tenantSlugHeader === 'string') {
      const slug = tenantSlugHeader.trim().toLowerCase();
      if (slug && !this.isReserved(slug)) {
        return slug;
      }
    }

    // 2. Identify candidate raw host
    let rawHost = forwardedHost || hostHeader;
    if (!rawHost && originHeader) {
      try {
        const parsedUrl = new URL(originHeader);
        rawHost = parsedUrl.host;
      } catch {
        // Ignore URL parse error
      }
    }

    if (!rawHost || typeof rawHost !== 'string') {
      return null;
    }

    // 3. Remove port and convert to lowercase
    const hostParts = rawHost.split(':');
    const hostname = (hostParts[0] || '').trim().toLowerCase();

    // Check for IP address (IPv4 or IPv6)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === 'localhost' || hostname === '::1') {
      return null;
    }

    const baseDomain = this.config.APP_BASE_DOMAIN?.toLowerCase() || 'localhost';
    let candidate: string | null = null;

    // 4. Match against localhost / lvh.me patterns (e.g. acme.localhost, acme.lvh.me)
    if (hostname.endsWith('.localhost')) {
      const parts = hostname.replace(/\.localhost$/, '').split('.');
      candidate = parts[parts.length - 1] || null;
    } else if (hostname.endsWith('.lvh.me')) {
      const parts = hostname.replace(/\.lvh\.me$/, '').split('.');
      candidate = parts[parts.length - 1] || null;
    } else if (baseDomain && baseDomain !== 'localhost' && hostname.endsWith(`.${baseDomain}`)) {
      // 5. Match against configured production/staging base domain (e.g. acme.kalpak.com)
      const prefix = hostname.slice(0, -(baseDomain.length + 1));
      const parts = prefix.split('.');
      candidate = parts[parts.length - 1] || null;
    } else {
      // 6. Generic subdomain detection (e.g. tenant.domain.com)
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        candidate = parts[0] || null;
      }
    }


    if (!candidate || this.isReserved(candidate)) {
      return null;
    }

    // Validate slug structure: lowercase alphanumeric and hyphens
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate)) {
      return null;
    }

    return candidate;
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
