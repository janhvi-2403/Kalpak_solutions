import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { EmailProviderStrategy, ParsedInboundEmail } from './email-provider.interface';
import { logger } from '@kalpak/logger';

@Injectable()
export class GenericInboundProvider implements EmailProviderStrategy {
  readonly name = 'GENERIC';

  verifyWebhook(headers: Record<string, any>, body: any, rawBody?: Buffer): boolean {
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET || '';
    if (!webhookSecret) {
      logger.warn('[GenericProvider] No webhook secret configured');
      return false;
    }

    // 1. Direct secret header check
    const secretHeader = headers['x-webhook-secret'] || headers['x-api-key'];
    if (secretHeader && secretHeader === webhookSecret) {
      return true;
    }

    // 2. HMAC-SHA256 signature header check
    const signature = headers['x-webhook-signature'] || headers['x-signature'];
    if (signature) {
      const payloadString = rawBody
        ? rawBody.toString('utf8')
        : typeof body === 'string'
          ? body
          : JSON.stringify(body || {});

      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(payloadString);
      const expected = hmac.digest('hex');

      try {
        return crypto.timingSafeEqual(
          Buffer.from(signature, 'utf8'),
          Buffer.from(expected, 'utf8')
        );
      } catch {
        return false;
      }
    }

    return false;
  }

  parseInboundEmail(_headers: Record<string, any>, body: any): ParsedInboundEmail {
    const fromRaw = body?.from || body?.sender || '';
    let fromEmail = fromRaw;
    let fromName: string | undefined = body?.fromName || body?.senderName;

    const nameMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/);
    if (nameMatch) {
      fromName = nameMatch[1].replace(/['"]/g, '').trim();
      fromEmail = nameMatch[2].trim();
    }

    const toRaw = body?.to || body?.recipient || '';
    const recipients: string[] = Array.isArray(toRaw) ? toRaw : [toRaw];
    const toEmail = (recipients[0] || '').toLowerCase().trim();

    return {
      provider: this.name,
      providerEventId: body?.eventId || body?.id,
      messageId:
        body?.messageId ||
        body?.message_id ||
        `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      fromEmail: fromEmail.toLowerCase().trim(),
      fromName,
      toEmail,
      allRecipients: recipients.map((r) => r.toLowerCase().trim()),
      subject: body?.subject || '(No Subject)',
      bodyText: (body?.text || body?.bodyText || body?.body || '').trim(),
      bodyHtml: body?.html || body?.bodyHtml,
      inReplyTo: body?.inReplyTo,
      threadId: body?.threadId,
      rawPayload: body,
    };
  }
}
