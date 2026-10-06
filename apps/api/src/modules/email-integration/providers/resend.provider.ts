import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { EmailProviderStrategy, ParsedInboundEmail } from './email-provider.interface';
import { logger } from '@kalpak/logger';

@Injectable()
export class ResendInboundProvider implements EmailProviderStrategy {
  readonly name = 'RESEND';

  verifyWebhook(headers: Record<string, any>, body: any, rawBody?: Buffer): boolean {
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET || process.env.RESEND_WEBHOOK_SECRET || '';
    if (!webhookSecret) {
      logger.warn('[ResendProvider] No webhook secret configured');
      return false;
    }

    const svixId = headers['svix-id'] || headers['x-svix-id'];
    const svixTimestamp = headers['svix-timestamp'] || headers['x-svix-timestamp'];
    const svixSignature = headers['svix-signature'] || headers['x-svix-signature'];

    if (!svixId || !svixTimestamp || !svixSignature) {
      // Fallback: check custom authorization header if used in direct testing
      if (headers['x-resend-webhook-secret'] === webhookSecret || headers['authorization'] === `Bearer ${webhookSecret}`) {
        return true;
      }
      return false;
    }

    // Prepare signing secret (strip whsec_ prefix if present)
    const secretKey = webhookSecret.startsWith('whsec_')
      ? Buffer.from(webhookSecret.substring(6), 'base64')
      : Buffer.from(webhookSecret, 'utf8');

    const bodyString = rawBody ? rawBody.toString('utf8') : JSON.stringify(body || {});
    const signedPayload = `${svixId}.${svixTimestamp}.${bodyString}`;

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signedPayload)
      .digest('base64');

    const signatures = (svixSignature as string).split(' ');
    for (const versionedSig of signatures) {
      const [version, signature] = versionedSig.split(',');
      if (version === 'v1' && signature === expectedSignature) {
        return true;
      }
    }

    return false;
  }

  parseInboundEmail(_headers: Record<string, any>, body: any): ParsedInboundEmail {
    const data = body?.data || body;
    const fromRaw = data?.from || body?.from || '';
    let fromEmail = fromRaw;
    let fromName: string | undefined;

    const nameMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/);
    if (nameMatch) {
      fromName = nameMatch[1].replace(/['"]/g, '').trim();
      fromEmail = nameMatch[2].trim();
    }

    const toRaw = data?.to || body?.to || [];
    const recipients: string[] = Array.isArray(toRaw) ? toRaw : [toRaw];
    const toEmail = (recipients[0] || '').toLowerCase().trim();

    const subject = data?.subject || body?.subject || '(No Subject)';
    const bodyText = data?.text || data?.body_text || body?.text || '';
    const bodyHtml = data?.html || data?.body_html || body?.html || undefined;
    const messageId =
      data?.email_id ||
      data?.message_id ||
      body?.message_id ||
      `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      provider: this.name,
      providerEventId: body?.id || data?.id,
      messageId,
      fromEmail: fromEmail.toLowerCase().trim(),
      fromName,
      toEmail,
      allRecipients: recipients.map((r) => r.toLowerCase().trim()),
      subject,
      bodyText: bodyText.trim(),
      bodyHtml,
      rawPayload: body,
    };
  }
}
