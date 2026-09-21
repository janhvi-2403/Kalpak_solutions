import { Injectable } from '@nestjs/common';
import { logger } from '@kalpak/logger';

export interface WhatsAppDispatchPayload {
  toPhone: string;
  recipientName?: string;
  template: 'ticket_alert' | 'ticket_assigned' | 'status_update' | 'sla_breach' | 'generic';
  parameters: Record<string, string | number>;
  bodyText?: string;
}

@Injectable()
export class WhatsAppNotificationAdapter {
  async send(payload: WhatsAppDispatchPayload): Promise<{ success: boolean; messageId: string; status: string }> {
    const messageId = `wamid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Ensure phone has clean formatting
    const formattedPhone = payload.toPhone.replace(/\s+/g, '').replace(/[-()]/g, '');

    logger.info(
      {
        channel: 'WHATSAPP',
        toPhone: formattedPhone,
        template: payload.template,
        messageId,
      },
      `[WhatsAppNotificationAdapter] Dispatching WhatsApp message to ${formattedPhone}`,
    );

    // Development / Local console log for real-time verification
    console.log('\n======================================================');
    console.log(`📱 [WHATSAPP NOTIFICATION DISPATCHED]`);
    console.log(`Recipient Phone: ${formattedPhone} (${payload.recipientName || 'Technician/Customer'})`);
    console.log(`Template: ${payload.template}`);
    if (payload.bodyText) {
      console.log(`Message:\n${payload.bodyText}`);
    }
    console.log('Parameters:', JSON.stringify(payload.parameters, null, 2));
    console.log('======================================================\n');

    return {
      success: true,
      messageId,
      status: 'delivered',
    };
  }
}
