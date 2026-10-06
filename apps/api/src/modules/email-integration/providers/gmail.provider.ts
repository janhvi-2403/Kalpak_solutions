import { Injectable, Logger } from '@nestjs/common';
import { getConfig } from '@kalpak/config';

export interface ParsedGmailMessage {
  providerMessageId: string;
  messageId: string;
  threadId?: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  ccEmail?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string;
  receivedAt: Date;
  rawPayload: any;
}

export interface GoogleTokenData {
  accessToken: string;
  refreshToken?: string;
  expiryDate: number;
  scope?: string;
  tokenType?: string;
}

@Injectable()
export class GmailEmailProvider {
  private readonly logger = new Logger(GmailEmailProvider.name);
  private readonly config = getConfig();

  get clientId(): string {
    return this.config.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  }

  get clientSecret(): string {
    return this.config.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  }

  get redirectUri(): string {
    return (
      this.config.GOOGLE_REDIRECT_URI ||
      process.env.GOOGLE_REDIRECT_URI ||
      `${this.config.API_BASE_URL}/api/v1/email-integration/gmail/oauth/callback`
    );
  }

  /**
   * Generates Google OAuth 2.0 authorization URL for connecting a support mailbox.
   * Forces re-authorization prompt and account selection so the Client Admin
   * explicitly grants the necessary Gmail read, send, and modify permissions.
   */
  getAuthorizationUrl(state: string): string {
    const scopes = [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent select_account',
      include_granted_scopes: 'true',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access and refresh tokens,
   * verifying that the required Gmail access scopes were granted by the user.
   */
  async exchangeCodeForTokens(code: string): Promise<{
    tokens: GoogleTokenData;
    emailAddress: string;
  }> {
    this.logger.log(`Exchanging OAuth authorization code for Google tokens...`);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Failed to exchange Google OAuth code: ${errText}`);
      throw new Error(`Google token exchange failed: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as any;
    const expiryDate = Date.now() + (data.expires_in || 3600) * 1000;

    const grantedScopes = (data.scope || '').toLowerCase();
    const hasGmailAccess =
      grantedScopes.includes('gmail.modify') ||
      grantedScopes.includes('mail.google.com') ||
      (grantedScopes.includes('gmail.readonly') && grantedScopes.includes('gmail.send'));

    if (!hasGmailAccess) {
      this.logger.warn(`Insufficient Gmail scopes granted: ${data.scope}`);
      throw new Error(
        'Required Gmail permissions were not granted. Please re-connect Gmail and ensure you check all the Gmail permission checkboxes on the Google authorization screen.'
      );
    }

    const tokens: GoogleTokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiryDate,
      scope: data.scope,
      tokenType: data.token_type,
    };

    // Retrieve verified Gmail address
    const profile = await this.getProfile(tokens.accessToken);

    return {
      tokens,
      emailAddress: profile.emailAddress.toLowerCase().trim(),
    };
  }

  /**
   * Refreshes access token using stored refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiryDate: number;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Failed to refresh Google access token: ${errText}`);
      throw new Error(`Failed to refresh Google token: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as any;
    return {
      accessToken: data.access_token,
      expiryDate: Date.now() + (data.expires_in || 3600) * 1000,
    };
  }

  /**
   * Retrieves Gmail profile information for the authenticated mailbox.
   */
  async getProfile(accessToken: string): Promise<{ emailAddress: string; historyId: string }> {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to fetch Gmail profile: ${response.status} ${errText}`);
    }

    return (await response.json()) as { emailAddress: string; historyId: string };
  }

  /**
   * Revokes Google OAuth token on disconnect.
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return response.ok;
    } catch (err) {
      this.logger.warn(`Failed to revoke token cleanly: ${err}`);
      return false;
    }
  }

  /**
   * Fetches new messages from Gmail inbox.
   */
  async fetchNewMessages(
    accessToken: string,
    query: string = 'label:INBOX'
  ): Promise<ParsedGmailMessage[]> {
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    listUrl.searchParams.set('q', query);
    listUrl.searchParams.set('maxResults', '25');

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      throw new Error(`Failed to list Gmail messages: ${listRes.status} ${errText}`);
    }

    const listData = (await listRes.json()) as any;
    if (!listData.messages || listData.messages.length === 0) {
      return [];
    }

    const parsedMessages: ParsedGmailMessage[] = [];

    for (const msgMeta of listData.messages) {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgMeta.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!msgRes.ok) continue;
        const msgData = (await msgRes.json()) as any;

        const parsed = this.parseGmailMessagePayload(msgData);
        if (parsed) {
          parsedMessages.push(parsed);
        }
      } catch (err) {
        this.logger.error(`Failed to parse Gmail message ${msgMeta.id}: ${err}`);
      }
    }

    return parsedMessages;
  }

  /**
   * Parses Gmail message headers and payload parts into structured ParsedGmailMessage.
   */
  private parseGmailMessagePayload(msg: any): ParsedGmailMessage | null {
    if (!msg || !msg.payload) return null;

    const headers: Record<string, string> = {};
    if (Array.isArray(msg.payload.headers)) {
      for (const h of msg.payload.headers) {
        if (h.name && h.value) {
          headers[h.name.toLowerCase()] = h.value;
        }
      }
    }

    const rawFrom = headers['from'] || '';
    const { email: fromEmail, name: fromName } = this.parseEmailAddress(rawFrom);
    const toEmail = (headers['to'] || '').toLowerCase().trim();
    const ccEmail = headers['cc'] ? headers['cc'].trim() : undefined;
    const subject = headers['subject'] || '(No Subject)';
    const messageId = headers['message-id'] || `<${msg.id}@mail.gmail.com>`;
    const inReplyTo = headers['in-reply-to'] ? headers['in-reply-to'].trim() : undefined;
    const references = headers['references'] ? headers['references'].trim() : undefined;

    const internalDate = msg.internalDate ? new Date(Number(msg.internalDate)) : new Date();

    const { text, html } = this.extractBodyParts(msg.payload);

    return {
      providerMessageId: msg.id,
      messageId,
      threadId: msg.threadId,
      fromEmail,
      fromName,
      toEmail,
      ccEmail,
      subject,
      bodyText: text || '',
      bodyHtml: html || undefined,
      inReplyTo,
      references,
      receivedAt: internalDate,
      rawPayload: msg,
    };
  }

  /**
   * Extracts text and HTML bodies from multipart Gmail payload.
   */
  private extractBodyParts(payload: any): { text: string; html: string } {
    let text = '';
    let html = '';

    const walk = (part: any) => {
      if (!part) return;

      if (part.mimeType === 'text/plain' && part.body?.data) {
        text += Buffer.from(part.body.data, 'base64url').toString('utf8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html += Buffer.from(part.body.data, 'base64url').toString('utf8');
      }

      if (Array.isArray(part.parts)) {
        for (const subPart of part.parts) {
          walk(subPart);
        }
      }
    };

    walk(payload);

    if (!text && html) {
      // Fallback text extraction if plain text is empty
      text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    return { text, html };
  }

  /**
   * Parses "First Last <user@example.com>" into email and optional name.
   */
  parseEmailAddress(header: string): { email: string; name?: string } {
    const match = header.match(/(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/);
    if (match) {
      const name = match[1]?.trim() || undefined;
      const email = (match[2] || '').trim().toLowerCase();
      return { email, name };
    }
    return { email: header.trim().toLowerCase() };
  }

  /**
   * Sends an outgoing email using Gmail API with RFC 2822 encoding.
   */
  async sendEmail(
    accessToken: string,
    fromEmail: string,
    options: {
      to: string;
      subject: string;
      bodyText?: string;
      bodyHtml?: string;
      inReplyTo?: string;
      references?: string;
    }
  ): Promise<{ messageId: string; providerMessageId: string }> {
    const generatedMessageId = `<kalpak-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@${fromEmail.split('@')[1] || 'gmail.com'}>`;

    const headers: string[] = [
      `From: ${fromEmail}`,
      `To: ${options.to}`,
      `Subject: =?utf-8?B?${Buffer.from(options.subject, 'utf8').toString('base64')}?=`,
      `Message-ID: ${generatedMessageId}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
    ];

    if (options.inReplyTo) {
      headers.push(`In-Reply-To: ${options.inReplyTo}`);
    }
    if (options.references) {
      headers.push(`References: ${options.references}`);
    }

    const isHtml = !!options.bodyHtml;
    headers.push(
      isHtml
        ? `Content-Type: text/html; charset=UTF-8`
        : `Content-Type: text/plain; charset=UTF-8`
    );

    const bodyContent = options.bodyHtml || options.bodyText || '';
    const rawRfc = `${headers.join('\r\n')}\r\n\r\n${bodyContent}`;
    const encodedRaw = Buffer.from(rawRfc, 'utf8').toString('base64url');

    this.logger.log(`Sending email via Gmail API to ${options.to} (Subject: ${options.subject})`);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedRaw }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Failed to send email via Gmail API: ${errText}`);
      throw new Error(`Gmail API send failed: ${response.status} ${errText}`);
    }

    const result = (await response.json()) as any;
    return {
      messageId: generatedMessageId,
      providerMessageId: result.id,
    };
  }

  /**
   * Modifies an email's labels in Gmail (e.g. remove UNREAD, or add custom labels).
   */
  async modifyMessageLabels(
    accessToken: string,
    providerMessageId: string,
    options: { addLabelIds?: string[]; removeLabelIds?: string[] }
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${providerMessageId}/modify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addLabelIds: options.addLabelIds || [],
            removeLabelIds: options.removeLabelIds || [],
          }),
        }
      );
      return response.ok;
    } catch (err) {
      this.logger.warn(`Failed to modify labels for message ${providerMessageId}: ${err}`);
      return false;
    }
  }
}
