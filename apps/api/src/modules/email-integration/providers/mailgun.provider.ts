import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { EmailProviderStrategy, ParsedInboundEmail } from './email-provider.interface';
import { logger } from '@kalpak/logger';

@Injectable()
export class MailgunInboundProvider implements EmailProviderStrategy {
  readonly name = 'MAILGUN';

  verifyWebhook(headers: Record<string, any>, body: any, _rawBody?: Buffer): boolean {
    const signingKey = process.env.EMAIL_WEBHOOK_SECRET || process.env.MAILGUN_WEBHOOK_SIGNING_KEY || '';
    if (!signingKey) {
      logger.warn('[MailgunProvider] No EMAIL_WEBHOOK_SECRET configured for signature verification');
      return false;
    }

    // Mailgun passes signature details either in nested signature object or top-level body/headers
    const timestamp =
      body?.signature?.timestamp || body?.timestamp || headers['x-mailgun-timestamp'] || '';
    const token = body?.signature?.token || body?.token || headers['x-mailgun-token'] || '';
    const signature =
      body?.signature?.signature || body?.signature || headers['x-mailgun-signature'] || '';

    if (!timestamp || !token || !signature) {
      logger.warn(
        { hasTimestamp: !!timestamp, hasToken: !!token, hasSignature: !!signature },
        '[MailgunProvider] Missing timestamp, token, or signature in Mailgun payload'
      );
      return false;
    }

    // Verify HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(`${timestamp}${token}`);
    const calculatedSignature = hmac.digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(calculatedSignature, 'utf8'),
        Buffer.from(signature, 'utf8')
      );
    } catch (err) {
      return false;
    }
  }

  parseInboundEmail(_headers: Record<string, any>, body: any): ParsedInboundEmail {
    // Handle both Mailgun Inbound Routes and Event Data structures
    const recipient =
      body?.recipient ||
      body?.['recipient'] ||
      body?.To ||
      body?.['event-data']?.message?.recipients?.[0] ||
      '';

    const sender =
      body?.sender ||
      body?.['From'] ||
      body?.from ||
      body?.['event-data']?.message?.headers?.from ||
      '';

    // Parse sender email and optional display name
    let fromEmail = sender;
    let fromName: string | undefined;
    const nameMatch = sender.match(/^(.*?)\s*<(.+?)>$/);
    if (nameMatch) {
      fromName = nameMatch[1].replace(/['"]/g, '').trim();
      fromEmail = nameMatch[2].trim();
    }

    const toEmail = recipient.toLowerCase().trim();
    const subject =
      body?.subject ||
      body?.Subject ||
      body?.['event-data']?.message?.headers?.subject ||
      '(No Subject)';

    // Plain text content (stripped-text removes signature / quoted text)
    const bodyText =
      body?.['stripped-text'] ||
      body?.['body-plain'] ||
      body?.text ||
      body?.['event-data']?.message?.headers?.['body-plain'] ||
      '';

    const bodyHtml =
      body?.['stripped-html'] ||
      body?.['body-html'] ||
      body?.html ||
      undefined;

    const messageId =
      body?.['Message-Id'] ||
      body?.['message-id'] ||
      body?.['event-data']?.message?.headers?.['message-id'] ||
      `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const inReplyTo =
      body?.['In-Reply-To'] ||
      body?.['in-reply-to'] ||
      body?.['event-data']?.message?.headers?.['in-reply-to'] ||
      undefined;

    const eventId = body?.['event-data']?.id || body?.id || undefined;

    return {
      provider: this.name,
      providerEventId: eventId,
      messageId,
      fromEmail: fromEmail.toLowerCase().trim(),
      fromName,
      toEmail,
      allRecipients: [toEmail],
      subject,
      bodyText: bodyText.trim(),
      bodyHtml,
      inReplyTo,
      rawPayload: body,
    };
  }
}
