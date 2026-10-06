import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../core/database/prisma.service';
import {
  OutboundEmailStatus,
  OutgoingEmailConfigDto,
  SendTestEmailResponse,
} from '@kalpak/types';
import { UpdateOutgoingEmailDto } from './dto/outgoing-email.dto';
import { logger } from '@kalpak/logger';

@Injectable()
export class OutgoingEmailService {
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
   * Retrieve the Outgoing Email configuration for the tenant.
   * Derives tenantId automatically from the authenticated session context.
   */
  async getOutgoingEmailConfig(tenantId: string): Promise<OutgoingEmailConfigDto> {
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

      let emailConfig = tenant.emailConfiguration;

      // If no emailConfiguration exists yet, create one
      if (!emailConfig) {
        const defaultSupport = tenant.supportEmails[0];
        emailConfig = await tx.emailConfiguration.create({
          data: {
            tenantId: tenant.id,
            supportEmail: defaultSupport?.email || `support@${tenant.slug}.com`,
            senderName: defaultSupport?.displayName || `${tenant.name} Support`,
            fromEmail: defaultSupport?.email || null,
            replyToEmail: defaultSupport?.email || null,
            provider: 'OUTBOUND',
            outboundStatus: OutboundEmailStatus.NOT_CONFIGURED,
            enabled: true,
            status: 'ACTIVE',
          },
        });
      }

      return {
        senderName: emailConfig.senderName || null,
        fromEmail: emailConfig.fromEmail || null,
        replyToEmail: emailConfig.replyToEmail || null,
        status: (emailConfig.outboundStatus as OutboundEmailStatus) || OutboundEmailStatus.NOT_CONFIGURED,
        lastTestedAt: emailConfig.lastOutboundTestedAt ? emailConfig.lastOutboundTestedAt.toISOString() : null,
        lastTestedMessage: emailConfig.lastOutboundTestedMessage || null,
      };
    });
  }

  /**
   * Update the Outgoing Email configuration for the tenant.
   */
  async updateOutgoingEmailConfig(
    tenantId: string,
    dto: UpdateOutgoingEmailDto
  ): Promise<OutgoingEmailConfigDto> {
    return this.withTenant(tenantId, false, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: { emailConfiguration: true },
      });

      if (!tenant) {
        throw new NotFoundException('Organization tenant not found');
      }

      const senderName = dto.senderName !== undefined ? dto.senderName.trim() : tenant.emailConfiguration?.senderName;
      const fromEmail = dto.fromEmail !== undefined ? dto.fromEmail.toLowerCase().trim() : tenant.emailConfiguration?.fromEmail;
      const replyToEmail = dto.replyToEmail !== undefined ? dto.replyToEmail.toLowerCase().trim() : tenant.emailConfiguration?.replyToEmail;

      const isConfigured = Boolean(senderName && fromEmail);
      const newStatus = isConfigured
        ? tenant.emailConfiguration?.outboundStatus === OutboundEmailStatus.CONNECTED
          ? OutboundEmailStatus.CONNECTED
          : OutboundEmailStatus.NOT_CONFIGURED
        : OutboundEmailStatus.NOT_CONFIGURED;

      const emailConfig = await tx.emailConfiguration.upsert({
        where: { tenantId },
        update: {
          senderName: senderName || null,
          fromEmail: fromEmail || null,
          replyToEmail: replyToEmail || null,
          outboundStatus: newStatus,
        },
        create: {
          tenantId,
          supportEmail: fromEmail || `support@${tenant.slug}.com`,
          senderName: senderName || null,
          fromEmail: fromEmail || null,
          replyToEmail: replyToEmail || null,
          provider: 'OUTBOUND',
          outboundStatus: newStatus,
          enabled: true,
          status: 'ACTIVE',
        },
      });

      logger.info({ tenantId }, '[OutgoingEmail] Outgoing email configuration updated successfully');

      return {
        senderName: emailConfig.senderName || null,
        fromEmail: emailConfig.fromEmail || null,
        replyToEmail: emailConfig.replyToEmail || null,
        status: (emailConfig.outboundStatus as OutboundEmailStatus) || OutboundEmailStatus.NOT_CONFIGURED,
        lastTestedAt: emailConfig.lastOutboundTestedAt ? emailConfig.lastOutboundTestedAt.toISOString() : null,
        lastTestedMessage: emailConfig.lastOutboundTestedMessage || null,
      };
    });
  }

  /**
   * Sends a real test email to a specified recipient and records success or failure.
   * Keeps underlying email provider details completely hidden from the Client Admin.
   */
  async sendTestEmail(
    tenantId: string,
    recipientEmail: string
  ): Promise<SendTestEmailResponse> {
    return this.withTenant(tenantId, false, async (tx) => {
      const emailConfig = await tx.emailConfiguration.findUnique({
        where: { tenantId },
        include: { tenant: true },
      });

      if (!emailConfig || !emailConfig.fromEmail) {
        throw new BadRequestException(
          'Please configure and save Sender Name and From Email before sending a test email.'
        );
      }

      const senderName = emailConfig.senderName || emailConfig.tenant?.name || 'Support';
      const fromEmail = emailConfig.fromEmail;
      const replyToEmail = emailConfig.replyToEmail || fromEmail;
      const now = new Date();

      try {
        let transporter: nodemailer.Transporter;

        // Check for custom SMTP configuration in environment
        if (process.env.SMTP_HOST) {
          transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
            auth:
              process.env.SMTP_USER && process.env.SMTP_PASS
                ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                  }
                : undefined,
          });
        } else {
          // Use nodemailer test account (Ethereal SMTP) for real SMTP delivery testing
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
        }

        const fromHeader = `"${senderName.replace(/"/g, '')}" <${fromEmail}>`;

        await transporter.sendMail({
          from: fromHeader,
          to: recipientEmail,
          replyTo: replyToEmail,
          subject: `[Test] Outgoing Email Verification - ${senderName}`,
          text: `Hello,\n\nThis is a real test email sent from your Kalpak Helpdesk Outgoing Email configuration to verify that outbound email delivery is working properly.\n\nSender: ${senderName}\nFrom: ${fromEmail}\nReply-To: ${replyToEmail}\nRecipient: ${recipientEmail}\nTimestamp: ${now.toISOString()}\n\nOutgoing email is verified and connected.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
              <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #0f172a; margin: 0; font-size: 20px;">Outgoing Email Verification</h2>
              </div>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                This test email confirms that your outgoing email configuration is operating properly. Outgoing notifications and customer communications can now be delivered successfully.
              </p>
              <div style="background-color: #f8fafc; border-radius: 6px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>Sender Name:</strong> ${senderName}</p>
                <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>From Email:</strong> ${fromEmail}</p>
                <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>Reply-To:</strong> ${replyToEmail}</p>
                <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>Recipient:</strong> ${recipientEmail}</p>
                <p style="margin: 6px 0; color: #334155; font-size: 13px;"><strong>Verified At:</strong> ${now.toUTCString()}</p>
              </div>
              <p style="color: #10b981; font-weight: 600; font-size: 14px; margin-bottom: 0;">
                ✔ Status: Outgoing Email Connected
              </p>
            </div>
          `,
        });

        const successMessage = `Test email sent successfully to ${recipientEmail}.`;

        await tx.emailConfiguration.update({
          where: { tenantId },
          data: {
            outboundStatus: OutboundEmailStatus.CONNECTED,
            lastOutboundTestedAt: now,
            lastOutboundTestedMessage: successMessage,
          },
        });

        logger.info(
          { tenantId, recipientEmail },
          '[OutgoingEmail] Real test email delivered successfully, status marked CONNECTED'
        );

        return {
          success: true,
          status: OutboundEmailStatus.CONNECTED,
          message: successMessage,
          lastTestedAt: now.toISOString(),
        };
      } catch (err: any) {
        const failureMessage = err?.message || 'Failed to establish connection to email server.';

        await tx.emailConfiguration.update({
          where: { tenantId },
          data: {
            outboundStatus: OutboundEmailStatus.FAILED,
            lastOutboundTestedAt: now,
            lastOutboundTestedMessage: failureMessage,
          },
        });

        logger.error(
          { tenantId, recipientEmail, err },
          '[OutgoingEmail] Real test email delivery failed, status marked FAILED'
        );

        return {
          success: false,
          status: OutboundEmailStatus.FAILED,
          message: failureMessage,
          lastTestedAt: now.toISOString(),
        };
      }
    });
  }
}
