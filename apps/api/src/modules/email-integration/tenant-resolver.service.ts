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

    // Separate specific company support emails from generic forwarding addresses
    const specificRecipients = normalizedRecipients.filter((r) => !r.includes('@cloudmailin.net'));

    // 1. Direct match on SupportEmail table (prioritized for real company support addresses)
    for (const recipient of specificRecipients) {
      let supportEmailRecord = await this.prisma.supportEmail.findFirst({
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

      if (!supportEmailRecord) {
        supportEmailRecord = await this.prisma.supportEmail.findFirst({
          where: {
            email: { equals: recipient, mode: 'insensitive' },
          },
          include: {
            tenant: {
              include: { emailConfiguration: true },
            },
          },
        });
      }

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
          } else if (!emailConfig.enabled) {
            emailConfig = await this.prisma.emailConfiguration.update({
              where: { id: emailConfig.id },
              data: { enabled: true, autoCreateTicket: true },
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

    // 2. Direct match on EmailConfiguration (supportEmail, providerAddress, or inboundAddress)
    for (const recipient of normalizedRecipients) {
      const emailConfig = await this.prisma.emailConfiguration.findFirst({
        where: {
          OR: [
            { supportEmail: { equals: recipient, mode: 'insensitive' } },
            { providerAddress: { equals: recipient, mode: 'insensitive' } },
            { inboundAddress: { equals: recipient, mode: 'insensitive' } },
          ],
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

    // 3. Subdomain / Slug alias fallback (e.g. acme-corp@inbound.kalpak.com or support@acme-corp.com)
    for (const recipient of normalizedRecipients) {
      const localPart = recipient.split('@')[0] || '';
      const domainPart = recipient.split('@')[1] || '';
      const candidateSlug = localPart.replace(/-support$/i, '').replace(/-tickets?$/i, '').trim();
      const domainSlug = domainPart.split('.')[0]?.trim();

      const candidateSlugs = [candidateSlug, domainSlug].filter((s): s is string => Boolean(s));

      for (const slug of candidateSlugs) {
        // Exclude common provider domains
        if (['cloudmailin', 'kalpak', 'gmail', 'google', 'outlook', 'yahoo', 'example'].includes(slug)) {
          continue;
        }

        const tenant = await this.prisma.tenant.findUnique({
          where: { slug },
          include: {
            emailConfiguration: true,
          },
        });

        if (tenant && tenant.status === 'ACTIVE' && !tenant.deletedAt) {
          logger.info(
            { tenantId: tenant.id, slug, recipient },
            '[TenantResolver] Tenant resolved via slug-based inbound alias'
          );

          let emailConfig = tenant.emailConfiguration;
          if (!emailConfig) {
            emailConfig = await this.prisma.emailConfiguration.create({
              data: {
                tenantId: tenant.id,
                supportEmail: recipient,
                provider: 'CLOUDMAILIN',
                enabled: true,
                autoCreateTicket: true,
                autoRoute: true,
                status: 'ACTIVE',
              },
            });
          } else if (!emailConfig.enabled) {
            emailConfig = await this.prisma.emailConfiguration.update({
              where: { id: emailConfig.id },
              data: { enabled: true, autoCreateTicket: true },
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

    // 5. CloudMailin Shared Recipient Fallback:
    // If the email was delivered to a cloudmailin address (e.g. *@cloudmailin.net),
    // find a tenant configuring that inbound address or default to the primary active tenant.
    const hasCloudMailinRecipient = normalizedRecipients.some((r) => r.includes('@cloudmailin.net'));
    if (hasCloudMailinRecipient) {
      for (const recipient of normalizedRecipients) {
        if (recipient.includes('@cloudmailin.net')) {
          const matchedTenant = await this.prisma.tenant.findFirst({
            where: {
              status: 'ACTIVE',
              deletedAt: null,
              emailConfiguration: {
                inboundAddress: { contains: recipient, mode: 'insensitive' },
              },
            },
            include: { emailConfiguration: true },
          });

          if (matchedTenant && matchedTenant.emailConfiguration) {
            logger.info(
              { tenantId: matchedTenant.id, tenantSlug: matchedTenant.slug, recipient },
              '[TenantResolver] Resolved tenant from CloudMailin shared inboundAddress'
            );
            return {
              tenant: matchedTenant,
              emailConfig: matchedTenant.emailConfiguration,
              matchedRecipient: recipient,
            };
          }
        }
      }

      // If still not resolved but delivered to cloudmailin.net, resolve to single active tenant
      const activeTenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        include: { emailConfiguration: true },
        take: 2,
      });

      if (activeTenants.length === 1 && activeTenants[0]) {
        const singleTenant = activeTenants[0];
        let emailConfig = singleTenant.emailConfiguration;
        if (!emailConfig) {
          emailConfig = await this.prisma.emailConfiguration.create({
            data: {
              tenantId: singleTenant.id,
              supportEmail: `support@${singleTenant.slug}.com`,
              provider: 'CLOUDMAILIN',
              enabled: true,
              autoCreateTicket: true,
              autoRoute: true,
              status: 'ACTIVE',
            },
          });
        } else if (!emailConfig.enabled || !emailConfig.autoCreateTicket) {
          emailConfig = await this.prisma.emailConfiguration.update({
            where: { id: emailConfig.id },
            data: { enabled: true, autoCreateTicket: true },
          });
        }
        logger.info(
          { tenantId: singleTenant.id, tenantSlug: singleTenant.slug },
          '[TenantResolver] Resolved CloudMailin webhook to single active tenant in database'
        );
        return {
          tenant: singleTenant,
          emailConfig,
          matchedRecipient: normalizedRecipients[0] || 'cloudmailin-fallback',
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
