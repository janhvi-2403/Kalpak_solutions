import {
  Controller,
  Get,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../core/auth/public.decorator';
import { CloudMailinInboundProvider } from './providers/cloudmailin.provider';
import { InboundEmailService } from './inbound-email.service';

@ApiTags('CloudMailin Inbound Webhook')
@Controller(['webhooks/cloudmailin', 'api/webhooks/cloudmailin', 'api/v1/webhooks/cloudmailin'])
export class CloudMailinWebhookController {
  private readonly logger = new Logger(CloudMailinWebhookController.name);
  private readonly inFlightMessageIds = new Set<string>();

  constructor(
    private readonly cloudmailinProvider: CloudMailinInboundProvider,
    private readonly inboundEmailService: InboundEmailService
  ) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check for CloudMailin inbound webhook endpoint' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'Kalpak CloudMailin Inbound Webhook',
      targetFormat: 'JSON - Normalized',
      timestamp: new Date().toISOString(),
      endpoint: '/webhooks/cloudmailin',
    };
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive and Process CloudMailin Inbound Email',
    description:
      'Receives inbound email webhooks from CloudMailin in Normalized JSON format. Acknowledges immediately with HTTP 200 to prevent 408 timeouts, then processes tenant resolution, customer provisioning, ticket creation, and attachments asynchronously in the background.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email webhook acknowledged immediately and queued for background ticket processing',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid CloudMailin HTTP authentication credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Malformed CloudMailin payload or missing required sender/recipient',
  })
  async handleCloudMailinWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, any>
  ) {
    // 1. Verify Authentication (HTTP Basic Auth or Secret Token if configured)
    const isAuthorized = this.cloudmailinProvider.verifyWebhook(headers, req.body, req.rawBody);
    if (!isAuthorized) {
      this.logger.warn('[CloudMailinWebhook] Unauthorized request: Basic Auth / Secret credentials mismatch');
      throw new UnauthorizedException('Invalid CloudMailin webhook credentials');
    }

    // 2. Parse CloudMailin Normalized JSON into Standardized Inbound Email Model
    let parsed;
    try {
      parsed = this.cloudmailinProvider.parseInboundEmail(headers, req.body);
    } catch (err: any) {
      this.logger.error({ error: err.message }, '[CloudMailinWebhook] Failed to parse CloudMailin payload');
      throw new BadRequestException(`Malformed CloudMailin payload: ${err.message}`);
    }

    if (!parsed.fromEmail || !parsed.toEmail) {
      this.logger.warn('[CloudMailinWebhook] Missing required fromEmail or toEmail in parsed payload');
      throw new BadRequestException('CloudMailin payload missing required sender or recipient email');
    }

    // [WEBHOOK_RECEIVED] Log
    this.logger.log(
      `[CloudMailinWebhook] [WEBHOOK_RECEIVED] Message-ID='${parsed.messageId}', from='${parsed.fromEmail}', to='${parsed.toEmail}', subject='${parsed.subject}', attachmentsCount=${parsed.attachments?.length || 0}`
    );

    // 3. Deduplication Check for in-flight requests (prevent concurrent duplicate tickets on rapid webhook retries)
    if (this.inFlightMessageIds.has(parsed.messageId)) {
      this.logger.log(
        `[CloudMailinWebhook] [WEBHOOK_ACKNOWLEDGED] Message-ID '${parsed.messageId}' is already in-flight. Acknowledging with HTTP 200 immediately.`
      );
      return {
        success: true,
        status: 'IDEMPOTENT_IN_FLIGHT',
        provider: 'CLOUDMAILIN',
        messageId: parsed.messageId,
        message: 'Email webhook is already being processed',
        timestamp: new Date().toISOString(),
      };
    }

    // Mark as in-flight
    this.inFlightMessageIds.add(parsed.messageId);

    // [WEBHOOK_ACKNOWLEDGED] Log
    this.logger.log(
      `[CloudMailinWebhook] [WEBHOOK_ACKNOWLEDGED] Responding HTTP 200 OK immediately for Message-ID='${parsed.messageId}'`
    );

    // 4. Trigger Asynchronous Background Processing (Non-blocking)
    // CloudMailin receives response in < 5ms without waiting for DB, disk, or attachments
    setImmediate(async () => {
      this.logger.log(
        `[CloudMailinWebhook] [EMAIL_PROCESSING_STARTED] Background email processing started for Message-ID='${parsed.messageId}'`
      );

      try {
        const result = await this.inboundEmailService.processInboundEmail(parsed);

        if (result.status === 'TICKET_CREATED') {
          this.logger.log(
            `[CloudMailinWebhook] [TICKET_CREATED] Ticket #${result.ticketNumber} created for sender '${parsed.fromEmail}' in tenant '${result.tenantSlug}' (Ticket ID: ${result.ticketId})`
          );
        } else if (result.status === 'THREAD_REPLY_RECORDED') {
          this.logger.log(
            `[CloudMailinWebhook] [THREAD_REPLY_RECORDED] Thread reply recorded for ticket #${result.ticketNumber} in tenant '${result.tenantSlug}'`
          );
        } else if (result.status === 'IDEMPOTENT_IGNORED') {
          this.logger.log(
            `[CloudMailinWebhook] [IDEMPOTENT_IGNORED] Message-ID '${parsed.messageId}' was previously ingested for ticket #${result.ticketNumber || 'N/A'}`
          );
        } else {
          this.logger.warn(
            `[CloudMailinWebhook] [EMAIL_PROCESSING_SKIPPED] Status: ${result.status}, Reason: ${result.reason || 'N/A'}`
          );
        }
      } catch (err: any) {
        this.logger.error(
          { error: err.message, stack: err.stack },
          `[CloudMailinWebhook] [EMAIL_PROCESSING_FAILED] Failed to process inbound email for Message-ID='${parsed.messageId}'`
        );
      } finally {
        // Keep in in-flight set for 10 seconds to buffer against rapid retries, then clear
        setTimeout(() => {
          this.inFlightMessageIds.delete(parsed.messageId);
        }, 10000);
      }
    });

    // 5. Immediate HTTP 200 Acknowledgment to CloudMailin
    return {
      success: true,
      status: 'ACKNOWLEDGED',
      provider: 'CLOUDMAILIN',
      messageId: parsed.messageId,
      sender: parsed.fromEmail,
      recipient: parsed.toEmail,
      subject: parsed.subject,
      attachmentsCount: parsed.attachments?.length || 0,
      timestamp: new Date().toISOString(),
      message: 'CloudMailin email webhook acknowledged immediately. Processing ticket asynchronously in background.',
    };
  }
}
