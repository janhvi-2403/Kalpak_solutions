import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { MailgunInboundProvider } from './providers/mailgun.provider';
import { ResendInboundProvider } from './providers/resend.provider';
import { PostmarkInboundProvider } from './providers/postmark.provider';
import { GenericInboundProvider } from './providers/generic.provider';
import { CloudMailinInboundProvider } from './providers/cloudmailin.provider';
import { EmailProviderStrategy, ParsedInboundEmail } from './providers/email-provider.interface';
import { logger } from '@kalpak/logger';

@Injectable()
export class EmailProviderService {
  private readonly strategies: Map<string, EmailProviderStrategy> = new Map();

  constructor(
    private readonly mailgunProvider: MailgunInboundProvider,
    private readonly resendProvider: ResendInboundProvider,
    private readonly postmarkProvider: PostmarkInboundProvider,
    private readonly genericProvider: GenericInboundProvider,
    private readonly cloudmailinProvider: CloudMailinInboundProvider
  ) {
    this.strategies.set('MAILGUN', this.mailgunProvider);
    this.strategies.set('RESEND', this.resendProvider);
    this.strategies.set('POSTMARK', this.postmarkProvider);
    this.strategies.set('GENERIC', this.genericProvider);
    this.strategies.set('CLOUDMAILIN', this.cloudmailinProvider);
  }

  /**
   * Identifies the appropriate provider strategy based on configuration or signature headers.
   */
  resolveStrategy(headers: Record<string, any>, body: any): EmailProviderStrategy {
    // 1. Check auto-detection from signature headers / payload structure
    if (
      headers['x-cloudmailin-signature'] ||
      headers['x-cloudmailin-secret'] ||
      (body?.envelope && (body?.headers || body?.plain !== undefined))
    ) {
      return this.cloudmailinProvider;
    }
    if (headers['x-mailgun-signature'] || body?.signature?.signature) {
      return this.mailgunProvider;
    }
    if (headers['svix-id'] || headers['x-svix-id'] || headers['x-resend-webhook-secret']) {
      return this.resendProvider;
    }
    if (headers['x-postmark-secret']) {
      return this.postmarkProvider;
    }
    if (headers['x-webhook-signature'] || headers['x-webhook-secret']) {
      return this.genericProvider;
    }

    // 2. Fallback to configured EMAIL_PROVIDER environment setting
    const configured = (process.env.EMAIL_PROVIDER || 'cloudmailin').toUpperCase();
    const strategy = this.strategies.get(configured);
    if (strategy) {
      return strategy;
    }

    // Default to cloudmailin
    return this.cloudmailinProvider;
  }

  /**
   * Verifies the incoming webhook signature. Throws UnauthorizedException if invalid.
   */
  async verifyWebhook(headers: Record<string, any>, body: any, rawBody?: Buffer): Promise<EmailProviderStrategy> {
    const strategy = this.resolveStrategy(headers, body);

    logger.debug({ provider: strategy.name }, '[EmailProviderService] Verifying webhook signature');

    const isValid = await strategy.verifyWebhook(headers, body, rawBody);
    if (!isValid) {
      logger.warn(
        { provider: strategy.name },
        '[EmailProviderService] Webhook signature verification failed'
      );
      throw new UnauthorizedException(`Invalid ${strategy.name} webhook signature`);
    }

    return strategy;
  }

  /**
   * Parses the raw webhook payload into standardized ParsedInboundEmail
   */
  parseInboundEmail(strategy: EmailProviderStrategy, headers: Record<string, any>, body: any): ParsedInboundEmail {
    try {
      const parsed = strategy.parseInboundEmail(headers, body);
      if (!parsed.toEmail || !parsed.fromEmail) {
        throw new BadRequestException('Webhook payload missing required sender or recipient email');
      }
      return parsed;
    } catch (err: any) {
      logger.error({ error: err.message, provider: strategy.name }, '[EmailProviderService] Failed to parse inbound email');
      throw err instanceof BadRequestException ? err : new BadRequestException(`Failed to parse inbound email: ${err.message}`);
    }
  }
}
