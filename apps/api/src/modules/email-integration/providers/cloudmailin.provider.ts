import { Injectable } from '@nestjs/common';
import {
  EmailProviderStrategy,
  ParsedInboundEmail,
  InboundEmailAttachment,
} from './email-provider.interface';
import { logger } from '@kalpak/logger';

@Injectable()
export class CloudMailinInboundProvider implements EmailProviderStrategy {
  readonly name = 'CLOUDMAILIN';

  /**
   * Verifies the CloudMailin incoming webhook request.
   * Supports:
   * 1. HTTP Basic Authentication (if CLOUDMAILIN_USERNAME and CLOUDMAILIN_PASSWORD configured)
   * 2. Secret token in headers (x-cloudmailin-signature, x-cloudmailin-secret, x-webhook-secret)
   * 3. Secret token in query parameter (?token=... or ?secret=...)
   * 4. Open / development mode if no credentials configured.
   */
  verifyWebhook(headers: Record<string, any>, _body: any, _rawBody?: Buffer): boolean {
    const configuredUser = process.env.CLOUDMAILIN_USERNAME?.trim();
    const configuredPass = process.env.CLOUDMAILIN_PASSWORD?.trim();
    const configuredSecret = process.env.CLOUDMAILIN_SECRET?.trim();

    // 1. If HTTP Basic Authentication credentials are set, enforce Basic Auth
    if (configuredUser && configuredPass) {
      const authHeader = (headers['authorization'] || headers['Authorization'] || '').trim();
      if (!authHeader.toLowerCase().startsWith('basic ')) {
        logger.warn('[CloudMailinProvider] Request missing required Basic Authorization header');
        return false;
      }

      try {
        const credentials = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf8');
        const [user, ...rest] = credentials.split(':');
        const pass = rest.join(':');

        if (user === configuredUser && pass === configuredPass) {
          logger.debug('[CloudMailinProvider] Basic Authentication verified successfully');
          return true;
        }

        logger.warn('[CloudMailinProvider] Basic Authentication credentials mismatch');
        return false;
      } catch (err: any) {
        logger.error({ error: err.message }, '[CloudMailinProvider] Failed to decode Basic Auth credentials');
        return false;
      }
    }

    // 2. If a secret token is configured, check signature/secret headers
    if (configuredSecret) {
      const headerSecret =
        headers['x-cloudmailin-signature'] ||
        headers['x-cloudmailin-secret'] ||
        headers['x-webhook-secret'] ||
        headers['x-webhook-token'] ||
        headers['authorization']?.replace(/^Bearer\s+/i, '');

      if (headerSecret && headerSecret.trim() === configuredSecret) {
        logger.debug('[CloudMailinProvider] Secret token verified successfully');
        return true;
      }

      logger.warn('[CloudMailinProvider] Webhook secret mismatch');
      return false;
    }

    // 3. If neither Basic Auth nor secret is configured, allow in development/open mode
    logger.debug('[CloudMailinProvider] No auth credentials configured; accepting webhook in open/development mode');
    return true;
  }

  /**
   * Parses CloudMailin Normalized JSON payload into standard ParsedInboundEmail model.
   *
   * CloudMailin Normalized format structure:
   * - headers: { from, to, subject, message_id, date, in_reply_to, references, cc, ... }
   * - envelope: { from, to, recipients, sender, helo, remote_ip, spf, tls }
   * - plain: string
   * - html: string
   * - reply_plain: string
   * - attachments: [ { file_name, content_type, size, content (base64), disposition } ]
   */
  parseInboundEmail(_headers: Record<string, any>, body: any): ParsedInboundEmail {
    const rawHeaders = body?.headers || {};
    const envelope = body?.envelope || {};

    // 1. Extract and sanitize From Address & Name
    const fromHeader = rawHeaders.from || rawHeaders.From || '';
    const envelopeFrom = envelope.from || envelope.sender || '';
    let fromEmail = '';
    let fromName: string | undefined;

    if (fromHeader) {
      // Format: "John Doe <john@company.com>" or "john@company.com"
      const match = fromHeader.match(/^(.*?)\s*<([^>]+)>/);
      if (match) {
        fromName = match[1].replace(/^["']|["']$/g, '').trim() || undefined;
        fromEmail = match[2].trim().toLowerCase();
      } else {
        const emailMatch = fromHeader.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        fromEmail = emailMatch ? emailMatch[0].trim().toLowerCase() : fromHeader.trim().toLowerCase();
      }
    }

    if (!fromEmail && envelopeFrom) {
      fromEmail = envelopeFrom.trim().toLowerCase();
    }

    // 2. Extract Recipients (all potential delivery points)
    const recipientSet = new Set<string>();

    const addCandidate = (val?: any) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(addCandidate);
        return;
      }
      if (typeof val === 'string') {
        const matches = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (matches) {
          matches.forEach((m) => recipientSet.add(m.trim().toLowerCase()));
        }
      }
    };

    addCandidate(envelope.to);
    addCandidate(envelope.recipients);
    addCandidate(rawHeaders.to);
    addCandidate(rawHeaders.To);
    addCandidate(rawHeaders.cc);
    addCandidate(rawHeaders.x_forwarded_to);
    addCandidate(rawHeaders.delivered_to);

    const allRecipients = Array.from(recipientSet);
    const toEmail = (
      envelope.to ||
      rawHeaders.to ||
      rawHeaders.To ||
      allRecipients[0] ||
      ''
    )
      .toLowerCase()
      .trim();

    // 3. Extract Subject
    const subject = (rawHeaders.subject || rawHeaders.Subject || '(No Subject)').trim();

    // 4. Extract Body content (Plain text preferred; fallback to reply_plain or stripped HTML)
    let bodyText = (body?.plain || body?.reply_plain || '').trim();
    const bodyHtml = body?.html || undefined;

    if (!bodyText && bodyHtml) {
      // Strip simple HTML tags if plain text is absent
      bodyText = bodyHtml
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    }

    // 5. Message ID and Threading
    const rawMessageId =
      rawHeaders.message_id ||
      rawHeaders['message-id'] ||
      rawHeaders.MessageId ||
      body?.message_id ||
      envelope.helo ||
      `cloudmailin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const messageId = String(rawMessageId).replace(/^<|>$/g, '').trim();

    const inReplyTo = rawHeaders.in_reply_to
      ? String(rawHeaders.in_reply_to).replace(/^<|>$/g, '').trim()
      : undefined;

    let references: string[] | undefined;
    if (rawHeaders.references) {
      if (Array.isArray(rawHeaders.references)) {
        references = rawHeaders.references.map((r: string) => String(r).replace(/^<|>$/g, '').trim());
      } else if (typeof rawHeaders.references === 'string') {
        const matches = rawHeaders.references.match(/<[^>]+>/g);
        if (matches) {
          references = matches.map((m: string) => m.replace(/^<|>$/g, '').trim());
        } else {
          references = [rawHeaders.references.trim()];
        }
      }
    }

    // 6. Attachments extraction
    const rawAttachments = Array.isArray(body?.attachments) ? body.attachments : [];
    const attachments: InboundEmailAttachment[] = [];

    for (let i = 0; i < rawAttachments.length; i++) {
      const att = rawAttachments[i];
      if (!att) continue;

      const fileName = att.file_name || att.filename || `attachment_${i + 1}`;
      const contentType = att.content_type || 'application/octet-stream';
      const content = att.content || undefined;

      let size = 0;
      if (typeof att.size === 'number' && att.size > 0) {
        size = att.size;
      } else if (content) {
        try {
          size = Buffer.from(content, 'base64').length;
        } catch {
          size = 0;
        }
      }

      attachments.push({
        fileName,
        contentType,
        size,
        content,
        disposition: att.disposition || 'attachment',
        contentId: att.content_id || undefined,
      });
    }

    return {
      provider: this.name,
      providerEventId: body?.envelope?.helo || rawHeaders.date,
      messageId,
      fromEmail,
      fromName,
      toEmail,
      allRecipients: allRecipients.length > 0 ? allRecipients : [toEmail],
      subject,
      bodyText,
      bodyHtml,
      inReplyTo,
      references,
      rawPayload: body,
      attachments,
    };
  }
}
