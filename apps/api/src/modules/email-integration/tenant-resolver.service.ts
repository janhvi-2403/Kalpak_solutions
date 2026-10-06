import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Tenant, EmailConfiguration } from '@kalpak/database';
import { logger } from '@kalpak/logger';

export interface ResolvedTenantInfo {
  tenant: Tenant;
  emailConfig: EmailConfiguration;
  matchedRecipient: string;
}

@Injectable()
export class TenantResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves an existing active tenant that owns one of the recipient email addresses.
   * STRICT REQUIREMENT: If no configured tenant owns the recipient address, returns null
   * (unless CLOUDMAILIN_DEFAULT_TENANT_SLUG fallback is configured).
   * Under NO circumstances does this create a new tenant.
   */
  async resolveTenantFromRecipients(recipients: string[]): Promise<ResolvedTenantInfo | null> {
    if (!recipients || recipients.length === 0) {
      logger.warn('[TenantResolver] Empty recipients list provided');
      return null;
    }

    const normalizedRecipients = recipients.map((r) => r.toLowerCase().trim()).filter(Boolean);

    logger.debug({ recipients: normalizedRecipients }, '[TenantResolver] Attempting to resolve tenant from recipients');

    // 1. Direct match on EmailConfiguration (supportEmail, providerAddress, or inboundAddress)
    for (const recipient of normalizedRecipients) {
      const emailConfig = await this.prisma.emailConfiguration.findFirst({
        where: {
          OR: [
            { supportEmail: { equals: recipient, mode: 'insensitive' } },
            { providerAddress: { equals: recipient, mode: 'insensitive' } },
            { inboundAddress: { equals: recipient, mode: 'insensitive' } },
          ],
          enabled: true,
        },
        include: {
          tenant: true,
        },
      });

      if (emailConfig && emailConfig.tenant) {
        const tenant = emailConfig.tenant;
        if (tenant.status === 'ACTIVE' && !tenant.deletedAt) {
          logger.info(
            { tenantId: tenant.id, tenantSlug: tenant.slug, recipient },
            '[TenantResolver] Tenant successfully resolved from EmailConfiguration'
          );
          return {
            tenant,
            emailConfig,
            matchedRecipient: recipient,
          };
        } else {
          logger.warn(
            { tenantId: tenant.id, status: tenant.status },
            '[TenantResolver] Matched tenant is inactive or soft-deleted - ignoring'
          );
        }
      }
    }

    // 2. Direct match on SupportEmail table
    for (const recipient of normalizedRecipients) {
      const supportEmailRecord = await this.prisma.supportEmail.findFirst({
        where: {
          email: { equals: recipient, mode: 'insensitive' },
          isActive: true,
        },
        include: {
          tenant: {
            include: { emailConfiguration: true },
          },
        },
      });

      if (supportEmailRecord && supportEmailRecord.tenant) {
        const tenant = supportEmailRecord.tenant;
        if (tenant.status === 'ACTIVE' && !tenant.deletedAt) {
          logger.info(
            { tenantId: tenant.id, tenantSlug: tenant.slug, recipient },
            '[TenantResolver] Tenant resolved via SupportEmail record'
          );

          let emailConfig = tenant.emailConfiguration;
          if (!emailConfig) {
            emailConfig = await this.prisma.emailConfiguration.create({
              data: {
                tenantId: tenant.id,
                supportEmail: supportEmailRecord.email,
                provider: 'CLOUDMAILIN',
                enabled: true,
                autoCreateTicket: true,
                autoRoute: true,
                status: 'ACTIVE',
              },
            });
          }

          return {
            tenant,
            emailConfig,
            matchedRecipient: recipient,
          };
        }
      }
    }

    // 3. Subdomain / Slug alias fallback (e.g. acme-corp@inbound.kalpak.com or acme-corp@cloudmailin.net)
    for (const recipient of normalizedRecipients) {
      const localPart = recipient.split('@')[0] || '';
      const candidateSlug = localPart.replace(/-support$/i, '').replace(/-tickets?$/i, '').trim();

      if (candidateSlug) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { slug: candidateSlug },
          include: {
            emailConfiguration: true,
          },
        });

        if (
          tenant &&
          tenant.status === 'ACTIVE' &&
          !tenant.deletedAt &&
          tenant.emailConfiguration &&
          tenant.emailConfiguration.enabled
        ) {
          logger.info(
            { tenantId: tenant.id, candidateSlug, recipient },
            '[TenantResolver] Tenant resolved via slug-based inbound alias'
          );
          return {
            tenant,
            emailConfig: tenant.emailConfiguration,
            matchedRecipient: recipient,
          };
        }
      }
    }

    // 4. Configured Default Fallback for CloudMailin testing (e.g. CLOUDMAILIN_DEFAULT_TENANT_SLUG=apple)
    const defaultSlug = process.env.CLOUDMAILIN_DEFAULT_TENANT_SLUG?.trim();
    if (defaultSlug) {
      const defaultTenant = await this.prisma.tenant.findUnique({
        where: { slug: defaultSlug },
        include: {
          emailConfiguration: true,
        },
      });

      if (defaultTenant && defaultTenant.status === 'ACTIVE' && !defaultTenant.deletedAt) {
        logger.info(
          { tenantId: defaultTenant.id, defaultSlug },
          '[TenantResolver] Tenant resolved via CLOUDMAILIN_DEFAULT_TENANT_SLUG configuration'
        );

        let emailConfig = defaultTenant.emailConfiguration;
        if (!emailConfig) {
          emailConfig = await this.prisma.emailConfiguration.create({
            data: {
              tenantId: defaultTenant.id,
              supportEmail: `support@${defaultTenant.slug}.com`,
              provider: 'CLOUDMAILIN',
              enabled: true,
              autoCreateTicket: true,
              autoRoute: true,
              status: 'ACTIVE',
            },
          });
        }

        return {
          tenant: defaultTenant,
          emailConfig,
          matchedRecipient: normalizedRecipients[0] || 'default-cloudmailin',
        };
      }
    }

    // No tenant match found
    logger.warn(
      { recipients: normalizedRecipients },
      '[TenantResolver] CRITICAL: Recipient email does not match any configured tenant. Email safely rejected/ignored. NO tenant or ticket will be created.'
    );

    return null;
  }
}
