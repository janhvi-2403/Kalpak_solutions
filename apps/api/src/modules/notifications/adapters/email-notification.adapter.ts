import { Injectable } from '@nestjs/common';
import { logger } from '@kalpak/logger';
import { getConfig } from '@kalpak/config';

export interface EmailDispatchPayload {
  to: string;
  recipientName?: string;
  subject: string;
  template: 'TICKET_CREATED' | 'TICKET_ASSIGNED' | 'STATUS_CHANGED' | 'SLA_BREACH' | 'GENERIC';
  data: Record<string, any>;
}

@Injectable()
export class EmailNotificationAdapter {
  private readonly config = getConfig();

  async send(payload: EmailDispatchPayload): Promise<{ success: boolean; messageId: string }> {
    const messageId = `msg_em_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const webBase = this.config.WEB_BASE_URL || 'http://localhost:3000';
    const link = payload.data.link || `${webBase}/dashboard/tickets`;

    logger.info(
      {
        channel: 'EMAIL',
        to: payload.to,
        subject: payload.subject,
        template: payload.template,
        messageId,
      },
      `[EmailNotificationAdapter] Dispatching notification email to ${payload.to}`,
    );

    // Development Console Simulation Output
    console.log('\n======================================================');
    console.log(`📧 [EMAIL NOTIFICATION DISPATCHED]`);
    console.log(`To: ${payload.to} (${payload.recipientName || 'User'})`);
    console.log(`Subject: ${payload.subject}`);
    console.log(`Template: ${payload.template}`);
    console.log(`Link: ${link}`);
    console.log('Data:', JSON.stringify(payload.data, null, 2));
    console.log('======================================================\n');

    return { success: true, messageId };
  }
}
