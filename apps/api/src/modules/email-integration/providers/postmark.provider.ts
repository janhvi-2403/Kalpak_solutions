import { Injectable } from '@nestjs/common';
import { EmailProviderStrategy, ParsedInboundEmail } from './email-provider.interface';
import { logger } from '@kalpak/logger';

@Injectable()
export class PostmarkInboundProvider implements EmailProviderStrategy {
  readonly name = 'POSTMARK';

  verifyWebhook(headers: Record<string, any>, _body: any): boolean {
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET || '';
    if (!webhookSecret) {
      logger.warn('[PostmarkProvider] No webhook secret configured');
      return false;
    }

    const headerToken =
      headers['x-postmark-secret'] ||
      headers['x-webhook-secret'] ||
      headers['authorization']?.replace(/^Bearer\s+/i, '');

    if (headerToken && headerToken === webhookSecret) {
      return true;
    }

    return false;
  }

  parseInboundEmail(_headers: Record<string, any>, body: any): ParsedInboundEmail {
    const fromRaw = body?.From || body?.FromFull?.Email || '';
    const fromName = body?.FromName || body?.FromFull?.Name;
    const toEmail = (body?.To || body?.ToFull?.[0]?.Email || '').toLowerCase().trim();
    const subject = body?.Subject || '(No Subject)';
    const bodyText = body?.TextBody || body?.StrippedTextReply || '';
    const bodyHtml = body?.HtmlBody || undefined;
    const messageId =
      body?.MessageID ||
      `postmark_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      provider: this.name,
      providerEventId: body?.MessageID,
      messageId,
      fromEmail: fromRaw.toLowerCase().trim(),
      fromName,
      toEmail,
      allRecipients: [toEmail],
      subject,
      bodyText: bodyText.trim(),
      bodyHtml,
      rawPayload: body,
    };
  }
}
