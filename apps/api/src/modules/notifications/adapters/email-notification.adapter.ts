import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../../../core/database/prisma.service';
import { logger } from '@kalpak/logger';
import { getConfig } from '@kalpak/config';
import { GmailEmailProvider } from '../../email-integration/providers/gmail.provider';
import { GmailSyncService } from '../../email-integration/gmail-sync.service';
import { EmailConnectionStatus, EmailDirection, EmailProcessingStatus } from '@kalpak/database';

export interface EmailDispatchPayload {
  tenantId?: string;
  ticketId?: string;
  to: string;
  recipientName?: string;
  subject: string;
  template: 'TICKET_CREATED' | 'TICKET_ASSIGNED' | 'STATUS_CHANGED' | 'SLA_BREACH' | 'GENERIC';
  data: Record<string, any>;
}

@Injectable()
export class EmailNotificationAdapter {
  private readonly config = getConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef
  ) {}

  async send(payload: EmailDispatchPayload): Promise<{ success: boolean; messageId: string }> {
    const webBase = this.config.WEB_BASE_URL || 'http://localhost:3000';
    const link = payload.data.link || `${webBase}/dashboard/tickets`;

    // ─────────────────────────────────────────────────────────────────────────
    // If tenantId is provided, check for active Gmail connection and settings
    // ─────────────────────────────────────────────────────────────────────────
    if (payload.tenantId) {
      try {
        const emailConfig = await this.prisma.emailConfiguration.findUnique({
          where: { tenantId: payload.tenantId },
        });

        // Respect Client Admin notification preference toggles
        if (emailConfig) {
          if (payload.template === 'TICKET_CREATED' && !emailConfig.notifyTicketCreated) {
            return { success: true, messageId: 'skipped_by_tenant_policy' };
          }
          if (payload.template === 'TICKET_ASSIGNED' && !emailConfig.notifyTicketAssigned) {
            return { success: true, messageId: 'skipped_by_tenant_policy' };
          }
          if (payload.template === 'STATUS_CHANGED') {
            if (payload.data?.newStatus === 'RESOLVED' && !emailConfig.notifyTicketResolved) {
              return { success: true, messageId: 'skipped_by_tenant_policy' };
            }
            if (payload.data?.newStatus === 'CLOSED' && !emailConfig.notifyTicketClosed) {
              return { success: true, messageId: 'skipped_by_tenant_policy' };
            }
            if (!emailConfig.notifyTicketStatusChanged) {
              return { success: true, messageId: 'skipped_by_tenant_policy' };
            }
          }
          if (payload.template === 'SLA_BREACH' && !emailConfig.notifyLongOpenTicket) {
            return { success: true, messageId: 'skipped_by_tenant_policy' };
          }
        }

        const connection = await this.prisma.emailConnection.findUnique({
          where: { tenantId: payload.tenantId },
        });

        if (connection && connection.status === EmailConnectionStatus.CONNECTED) {
          const gmailSync = this.moduleRef.get(GmailSyncService, { strict: false });
          const gmailProvider = this.moduleRef.get(GmailEmailProvider, { strict: false });

          if (gmailSync && gmailProvider) {
            const accessToken = await gmailSync.getValidAccessToken(connection);
            const htmlContent = this.generateHtml(payload, link);

            const sent = await gmailProvider.sendEmail(accessToken, connection.emailAddress, {
              to: payload.to,
              subject: payload.subject,
              bodyHtml: htmlContent,
            });

            // Store outbound EmailMessage record
            await this.prisma.emailMessage.create({
              data: {
                tenantId: payload.tenantId,
                ticketId: payload.ticketId || null,
                provider: 'GMAIL',
                providerMessageId: sent.providerMessageId,
                messageId: sent.messageId,
                fromEmail: connection.emailAddress,
                toEmail: payload.to,
                subject: payload.subject,
                bodyHtml: htmlContent,
                direction: EmailDirection.OUTBOUND,
                processingStatus: EmailProcessingStatus.PROCESSED,
                receivedAt: new Date(),
              },
            });

            logger.info(
              {
                tenantId: payload.tenantId,
                to: payload.to,
                subject: payload.subject,
                providerMessageId: sent.providerMessageId,
              },
              `[EmailNotificationAdapter] Real notification email sent via Gmail API`
            );

            return { success: true, messageId: sent.messageId };
          }
        }
      } catch (err) {
        logger.error(
          { err, payload },
          '[EmailNotificationAdapter] Failed to send via Gmail API, falling back to simulated output'
        );
      }
    }

    // Fallback simulation logger (for local dev / unconfigured Gmail)
    const simulatedMessageId = `msg_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info(
      {
        channel: 'EMAIL',
        to: payload.to,
        subject: payload.subject,
        template: payload.template,
        simulatedMessageId,
      },
      `[EmailNotificationAdapter] Dispatched email notification to ${payload.to}`
    );

    console.log('\n======================================================');
    console.log(`📧 [EMAIL NOTIFICATION DISPATCHED]`);
    console.log(`To: ${payload.to} (${payload.recipientName || 'User'})`);
    console.log(`Subject: ${payload.subject}`);
    console.log(`Template: ${payload.template}`);
    console.log(`Link: ${link}`);
    console.log('Data:', JSON.stringify(payload.data, null, 2));
    console.log('======================================================\n');

    return { success: true, messageId: simulatedMessageId };
  }

  private generateHtml(payload: EmailDispatchPayload, link: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background-color: #f97316; padding: 18px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Kalpak Service Notification</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
          <p style="font-size: 16px; margin-top: 0;">Hello ${payload.recipientName || 'Valued Customer'},</p>
          <p style="font-size: 15px; color: #334155;">${payload.subject}</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #f97316; padding: 14px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px;"><strong>Ticket:</strong> ${payload.data.ticketNumber || 'N/A'}</p>
            ${payload.data.title ? `<p style="margin: 4px 0 0; font-size: 14px;"><strong>Subject:</strong> ${payload.data.title}</p>` : ''}
            ${payload.data.priority ? `<p style="margin: 4px 0 0; font-size: 14px;"><strong>Priority:</strong> ${payload.data.priority}</p>` : ''}
            ${payload.data.newStatus ? `<p style="margin: 4px 0 0; font-size: 14px;"><strong>New Status:</strong> ${payload.data.newStatus}</p>` : ''}
          </div>

          <p style="margin: 24px 0;">
            <a href="${link}" style="background-color: #f97316; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
              View Ticket in Portal
            </a>
          </p>

          <p style="font-size: 13px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            You can also reply directly to this email to add notes or provide updates.<br/>
            &copy; Kalpak Solutions. All rights reserved.
          </p>
        </div>
      </div>
    `;
  }
}
