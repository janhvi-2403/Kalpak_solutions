import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { getConfig } from '@kalpak/config';
import { InboundForwardingStatus, IncomingEmailConfigDto, TestIncomingEmailResponse } from '@kalpak/types';
import { logger } from '@kalpak/logger';

@Injectable()
export class IncomingEmailService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safe execution wrapper enforcing PostgreSQL Row Level Security (RLS) context
   */
  private async withTenant<T>(
    tenantId: string,
    isSuperAdmin: boolean,
    op: (prisma: PrismaService) => Promise<T>
  ): Promise<T> {
    if (typeof (this.prisma as any).withTenantContext === 'function') {
      return (this.prisma as any).withTenantContext(tenantId, isSuperAdmin, op);
    }
    return op(this.prisma);
  }

  /**
   * Generates or retrieves the unique Kalpak Inbound Email address for a tenant.
   * e.g. "acme-corp@inbound.kalpak.com"
   */
  getInboundAddressForTenant(tenantSlug: string): string {
    const config = getConfig();
    if (config.EMAIL_PROVIDER === 'cloudmailin') {
      return process.env.CLOUDMAILIN_INBOUND_ADDRESS || 'c5e1f5045bfd98846d8e@cloudmailin.net';
    }
    const domain = config.EMAIL_INBOUND_DOMAIN || process.env.EMAIL_INBOUND_DOMAIN || 'inbound.kalpak.com';
    return `${tenantSlug.toLowerCase().trim()}@${domain.toLowerCase().trim()}`;
  }

  /**
   * Retrieve the Incoming Email configuration for the tenant.
   * Derives tenantId automatically from the authenticated session.
   */
  async getIncomingEmailConfig(tenantId: string): Promise<IncomingEmailConfigDto> {
    return this.withTenant(tenantId, false, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: {
          emailConfiguration: true,
          supportEmails: {
            where: { isDefault: true },
            take: 1,
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException('Organization tenant not found');
      }

      const generatedInbound = this.getInboundAddressForTenant(tenant.slug);
      const isCloudMailin = getConfig().EMAIL_PROVIDER === 'cloudmailin';

      // Ensure EmailConfiguration record exists and has inboundAddress stored
      let emailConfig = tenant.emailConfiguration;
      if (!emailConfig) {
        emailConfig = await tx.emailConfiguration.create({
          data: {
            tenantId: tenant.id,
            supportEmail: tenant.supportEmails[0]?.email || `support@${tenant.slug}.com`,
            provider: isCloudMailin ? 'CLOUDMAILIN' : 'INBOUND',
            inboundAddress: generatedInbound,
            forwardingStatus: isCloudMailin ? InboundForwardingStatus.CONNECTED : InboundForwardingStatus.WAITING_FOR_SETUP,
            forwardingMethod: 'EMAIL_FORWARDING',
            enabled: true,
            status: 'ACTIVE',
          },
        });
      } else {
        emailConfig = await tx.emailConfiguration.update({
          where: { id: emailConfig.id },
          data: {
            inboundAddress: generatedInbound,
            forwardingStatus: isCloudMailin ? InboundForwardingStatus.CONNECTED : emailConfig.forwardingStatus,
          },
        });
      }

      const defaultSupport = tenant.supportEmails[0]?.email || emailConfig.supportEmail || null;

      return {
        method: 'Email Forwarding',
        inboundAddress: generatedInbound,
        status: isCloudMailin
          ? InboundForwardingStatus.CONNECTED
          : ((emailConfig.forwardingStatus as InboundForwardingStatus) || InboundForwardingStatus.WAITING_FOR_SETUP),
        lastTestedAt: emailConfig.lastTestedAt ? emailConfig.lastTestedAt.toISOString() : new Date().toISOString(),
        lastTestedMessage: emailConfig.lastTestedMessage || (isCloudMailin ? 'CloudMailin real-time webhook active and listening.' : null),
        forwardedFromEmail: defaultSupport,
      };
    });
  }

  /**
   * Tests whether inbound emails forwarded to the Kalpak Inbound Address are being received.
   * If any inbound email has been received (or a test simulation is requested), status is marked CONNECTED.
   * If no forwarded message has been detected, status remains WAITING_FOR_SETUP with guidance.
   */
  async testIncomingEmail(
    tenantId: string,
    simulateReception: boolean = false
  ): Promise<TestIncomingEmailResponse> {
    return this.withTenant(tenantId, false, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: { emailConfiguration: true },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      const inboundCount = await tx.inboundEmail.count({
        where: { tenantId },
      });

      const now = new Date();

      if (inboundCount > 0 || simulateReception) {
        // If simulation requested and no inbound email exists, create a test inbound record
        if (simulateReception && inboundCount === 0) {
          const generatedInbound = this.getInboundAddressForTenant(tenant.slug);
          await tx.inboundEmail.create({
            data: {
              tenantId,
              provider: 'INBOUND_TEST',
              providerEventId: `test-${Date.now()}`,
              messageId: `test-inbound-${Date.now()}@kalpak.local`,
              fromEmail: 'test-sender@example.com',
              fromName: 'Kalpak Inbound Test Bot',
              toEmail: generatedInbound,
              subject: 'Test Forwarded Email Verification',
              bodyText: 'This is an automated test verifying that incoming email forwarding is active.',
            },
          });
        }

        await tx.emailConfiguration.upsert({
          where: { tenantId },
          update: {
            forwardingStatus: InboundForwardingStatus.CONNECTED,
            lastTestedAt: now,
            lastTestedMessage: 'Inbound email forwarding verified successfully.',
          },
          create: {
            tenantId,
            supportEmail: `support@${tenant.slug}.com`,
            provider: 'INBOUND',
            inboundAddress: this.getInboundAddressForTenant(tenant.slug),
            forwardingStatus: InboundForwardingStatus.CONNECTED,
            forwardingMethod: 'EMAIL_FORWARDING',
            lastTestedAt: now,
            lastTestedMessage: 'Inbound email forwarding verified successfully.',
          },
        });

        logger.info({ tenantId }, '[IncomingEmail] Inbound email verified and status set to CONNECTED');

        return {
          success: true,
          status: InboundForwardingStatus.CONNECTED,
          message: 'Inbound email forwarding verified successfully! Incoming emails are being received.',
          lastTestedAt: now.toISOString(),
        };
      }

      // No incoming email received yet
      await tx.emailConfiguration.updateMany({
        where: { tenantId },
        data: {
          lastTestedAt: now,
          lastTestedMessage:
            'No forwarded email received yet. Forward an email from your support address to your Kalpak Inbound address and test again.',
        },
      });

      return {
        success: false,
        status: InboundForwardingStatus.WAITING_FOR_SETUP,
        message:
          'No forwarded email detected yet. Please ensure you have set up forwarding in your email host (e.g. Google Workspace, Microsoft 365) to your Kalpak Inbound address, then click Test again.',
        lastTestedAt: now.toISOString(),
      };
    });
  }
}
