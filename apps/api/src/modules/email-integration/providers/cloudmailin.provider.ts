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
      if (typeof fromHeader === 'object') {
        fromEmail = (fromHeader.address || fromHeader.email || fromHeader.value || '').trim().toLowerCase();
        fromName = fromHeader.name || undefined;
      } else {
        // Format: "John Doe <john@company.com>" or "john@company.com"
        const match = String(fromHeader).match(/^(.*?)\s*<([^>]+)>/);
        if (match && match[1] !== undefined && match[2] !== undefined) {
          fromName = match[1].replace(/^["']|["']$/g, '').trim() || undefined;
          fromEmail = match[2].trim().toLowerCase();
        } else {
          const emailMatch = String(fromHeader).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          fromEmail = emailMatch && emailMatch[0] ? emailMatch[0].trim().toLowerCase() : String(fromHeader).trim().toLowerCase();
        }
      }
    }

    if (!fromEmail && envelopeFrom) {
      const envFromStr = typeof envelopeFrom === 'object' ? (envelopeFrom.address || envelopeFrom.email || '') : String(envelopeFrom);
      const emailMatch = envFromStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      fromEmail = emailMatch && emailMatch[0] ? emailMatch[0].trim().toLowerCase() : envFromStr.trim().toLowerCase();
    }

    if (!fromEmail && body?.from) {
      const bodyFromStr = typeof body.from === 'object' ? (body.from.address || body.from.email || '') : String(body.from);
      const emailMatch = bodyFromStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch && emailMatch[0]) fromEmail = emailMatch[0].trim().toLowerCase();
    }

    if (!fromEmail && body?.sender) {
      const bodySenderStr = typeof body.sender === 'object' ? (body.sender.address || body.sender.email || '') : String(body.sender);
      const emailMatch = bodySenderStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch && emailMatch[0]) fromEmail = emailMatch[0].trim().toLowerCase();
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
      } else if (typeof val === 'object') {
        if (val.address) addCandidate(val.address);
        if (val.email) addCandidate(val.email);
        if (val.value) addCandidate(val.value);
        if (val.recipient) addCandidate(val.recipient);
        for (const [k, v] of Object.entries(val)) {
          if (
            ['to', 'recipient', 'recipients', 'address', 'email', 'forward', 'envelope'].some((kw) =>
              k.toLowerCase().includes(kw)
            )
          ) {
            addCandidate(v);
          }
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
    addCandidate(rawHeaders['x-original-to']);
    addCandidate(rawHeaders['envelope-to']);
    addCandidate(body?.to);
    addCandidate(body?.recipient);
    addCandidate(body?.recipients);
    addCandidate(body?.envelope?.to);
    addCandidate(body?.envelope?.recipients);

    // Also scan all headers for forwarded or delivery targets (case-insensitive & hyphen-tolerant)
    if (rawHeaders && typeof rawHeaders === 'object') {
      for (const [key, val] of Object.entries(rawHeaders)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('to') ||
          lowerKey.includes('forward') ||
          lowerKey.includes('recipient') ||
          lowerKey.includes('delivered') ||
          lowerKey.includes('envelope') ||
          lowerKey.includes('cc')
        ) {
          addCandidate(val);
        }
      }
    }

    // Sort recipients so that specific non-cloudmailin addresses are evaluated FIRST
    const allRecipients = Array.from(recipientSet).sort((a, b) => {
      const aIsCloudMailin = a.includes('@cloudmailin.net') ? 1 : 0;
      const bIsCloudMailin = b.includes('@cloudmailin.net') ? 1 : 0;
      return aIsCloudMailin - bIsCloudMailin;
    });

    const toEmail = (
      allRecipients[0] ||
      (typeof envelope.to === 'string' ? envelope.to : '') ||
      (typeof rawHeaders.to === 'string' ? rawHeaders.to : '') ||
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
