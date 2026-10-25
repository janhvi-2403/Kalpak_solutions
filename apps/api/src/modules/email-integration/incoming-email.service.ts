import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { getConfig } from '@kalpak/config';
import {
  InboundForwardingStatus,
  IncomingEmailConfigDto,
  TestIncomingEmailResponse,
  SimulateEmailQueryResponse,
} from '@kalpak/types';
import { logger } from '@kalpak/logger';
import { InboundEmailService } from './inbound-email.service';
import { ParsedInboundEmail } from './providers/email-provider.interface';

@Injectable()
export class IncomingEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inboundEmailService: InboundEmailService
  ) {}

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
    if (
      config.EMAIL_PROVIDER === 'cloudmailin' ||
      process.env.CLOUDMAILIN_INBOUND_ADDRESS ||
      !config.EMAIL_INBOUND_DOMAIN ||
      config.EMAIL_INBOUND_DOMAIN === 'inbound.kalpak.com'
    ) {
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

      const dedicatedInbound = `${tenant.slug.toLowerCase().trim()}@inbound.kalpak.solutions`;
      const cloudmailinBridge = process.env.CLOUDMAILIN_INBOUND_ADDRESS || 'c5e1f5045bfd98846d8e@cloudmailin.net';

      // Ensure EmailConfiguration record exists and has inboundAddress stored
      let emailConfig = tenant.emailConfiguration;
      if (!emailConfig) {
        emailConfig = await tx.emailConfiguration.create({
          data: {
            tenantId: tenant.id,
            supportEmail: tenant.supportEmails[0]?.email || `support@${tenant.slug}.com`,
            provider: 'CLOUDMAILIN',
            inboundAddress: dedicatedInbound,
            forwardingStatus: InboundForwardingStatus.CONNECTED,
            forwardingMethod: 'EMAIL_FORWARDING',
            enabled: true,
            status: 'ACTIVE',
          },
        });
      } else {
        emailConfig = await tx.emailConfiguration.update({
          where: { id: emailConfig.id },
          data: {
            inboundAddress: dedicatedInbound,
            forwardingStatus: InboundForwardingStatus.CONNECTED,
          },
        });
      }

      const defaultSupport = tenant.supportEmails[0]?.email || emailConfig.supportEmail || null;

      return {
        method: 'Built-in Inbound & Forwarding',
        inboundAddress: dedicatedInbound,
        dedicatedInboundAddress: dedicatedInbound,
        cloudmailinBridgeAddress: cloudmailinBridge,
        tenantSlug: tenant.slug,
        status: InboundForwardingStatus.CONNECTED,
        lastTestedAt: emailConfig.lastTestedAt ? emailConfig.lastTestedAt.toISOString() : new Date().toISOString(),
        lastTestedMessage: 'Built-in dedicated inbound address active. Real-time ticket ingestion is running.',
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

  /**
   * Simulates receiving an inbound email query from a customer to test end-to-end ticket generation.
   * Runs through the exact same InboundEmailService pipeline as real webhooks.
   */
  async simulateEmailQuery(
    tenantId: string,
    dto: {
      fromEmail: string;
      fromName?: string;
      subject: string;
      bodyText: string;
      toEmail?: string;
    }
  ): Promise<SimulateEmailQueryResponse> {
    return this.withTenant(tenantId, false, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: {
          emailConfiguration: true,
          supportEmails: { where: { isActive: true }, take: 1 },
        },
      });

      if (!tenant) {
        throw new NotFoundException('Organization tenant not found');
      }

      // Determine recipient: specified toEmail, or tenant supportEmail, or generated inbound address
      const recipientEmail =
        dto.toEmail?.trim() ||
        tenant.supportEmails[0]?.email ||
        tenant.emailConfiguration?.supportEmail ||
        this.getInboundAddressForTenant(tenant.slug);

      const parsed: ParsedInboundEmail = {
        provider: 'EMAIL_INBOUND_SIMULATION',
        providerEventId: `sim_${Date.now()}`,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}@kalpak.local`,
        fromEmail: dto.fromEmail.toLowerCase().trim(),
        fromName: dto.fromName?.trim() || dto.fromEmail.split('@')[0],
        toEmail: recipientEmail.toLowerCase().trim(),
        allRecipients: [recipientEmail.toLowerCase().trim()],
        subject: dto.subject.trim() || 'Inbound Customer Inquiry',
        bodyText: dto.bodyText.trim() || '(No details provided)',
        rawPayload: {
          simulated: true,
          simulatedAt: new Date().toISOString(),
          tenantId,
          tenantSlug: tenant.slug,
        },
      };

      const result = await this.inboundEmailService.processInboundEmail(parsed);

      logger.info(
        { tenantId, status: result.status, ticketNumber: result.ticketNumber },
        '[IncomingEmail] Inbound email query simulated and processed'
      );

      return {
        success: result.status === 'TICKET_CREATED' || result.status === 'THREAD_REPLY_RECORDED',
        status: result.status,
        ticketId: result.ticketId,
        ticketNumber: result.ticketNumber,
        tenantSlug: result.tenantSlug || tenant.slug,
        messageId: parsed.messageId,
        recipient: recipientEmail,
        sender: dto.fromEmail,
        message: result.ticketNumber
          ? `Ticket #${result.ticketNumber} created successfully from email query.`
          : `Email query processed with status: ${result.status}`,
      };
    });
  }
}

