export interface InboundEmailAttachment {
  fileName: string;
  contentType: string;
  size: number;
  content?: string; // Base64 encoded file payload
  disposition?: string;
  contentId?: string;
  filePath?: string; // Relative path if saved to disk
}

export interface ParsedInboundEmail {
  provider: string;
  providerEventId?: string;
  messageId: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  allRecipients: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string[];
  threadId?: string;
  rawPayload?: any;
  attachments?: InboundEmailAttachment[];
}

export interface EmailProviderStrategy {
  readonly name: string;
  verifyWebhook(headers: Record<string, any>, body: any, rawBody?: Buffer): Promise<boolean> | boolean;
  parseInboundEmail(headers: Record<string, any>, body: any): ParsedInboundEmail;
}
