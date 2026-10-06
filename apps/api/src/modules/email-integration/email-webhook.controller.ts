import {
  Controller,
  Get,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../core/auth/public.decorator';
import { EmailProviderService } from './email-provider.service';
import { InboundEmailService } from './inbound-email.service';

@ApiTags('Inbound Email Webhooks')
@Controller(['webhooks/email', 'api/webhooks/email', 'api/v1/webhooks/email'])
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);

  constructor(
    private readonly providerService: EmailProviderService,
    private readonly inboundEmailService: InboundEmailService
  ) {}

  @Public()
  @Get('inbound')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check for inbound email webhook' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'Kalpak Inbound Email Webhook',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive and Process Inbound Email Webhook',
    description:
      'Receives inbound email webhooks from external providers (Mailgun, Resend, Postmark, Generic). Verifies cryptographic signature, resolves tenant from recipient address, routes to appropriate department, auto-provisions customer within tenant, and creates support ticket.',
  })
  @ApiResponse({
    status: 200,
    description: 'Inbound email received and processed idempotently',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid webhook signature',
  })
  async handleInboundEmail(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, any>
  ) {
    this.logger.log('[EmailWebhookController] Inbound email webhook received');

    // 1. Verify Provider Signature (Mailgun HMAC, Resend Svix, Postmark Token, or Generic HMAC)
    const strategy = await this.providerService.verifyWebhook(
      headers,
      req.body,
      req.rawBody
    );

    // 2. Parse Standardized Inbound Email Model
    const parsed = this.providerService.parseInboundEmail(strategy, headers, req.body);

    // 3. Process Inbound Email Business Logic
    const result = await this.inboundEmailService.processInboundEmail(parsed);

    return {
      success: true,
      provider: strategy.name,
      ...result,
    };
  }
}
