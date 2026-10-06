import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { TenantResolverService } from './tenant-resolver.service';
import { DepartmentRoutingService } from './department-routing.service';
import { TicketsService } from '../tickets/tickets.service';
import { ParsedInboundEmail, InboundEmailAttachment } from './providers/email-provider.interface';
import { TenantContext, SystemRole, AuditEventType } from '@kalpak/types';
import { AuditService } from '../audit/audit.service';
import * as fs from 'fs';
import * as path from 'path';

export interface InboundEmailProcessResult {
  status:
    | 'TICKET_CREATED'
    | 'THREAD_REPLY_RECORDED'
    | 'IDEMPOTENT_IGNORED'
    | 'REJECTED_UNKNOWN_RECIPIENT'
    | 'REJECTED_DISABLED_TENANT';
  ticketId?: string;
  ticketNumber?: string;
  customerId?: string;
  tenantId?: string;
  tenantSlug?: string;
  reason?: string;
  messageId: string;
}

export interface SavedAttachmentInfo {
  fileName: string;
  contentType: string;
  size: number;
  filePath: string;
  savedAt: string;
}

@Injectable()
export class InboundEmailService {
  private readonly logger = new Logger(InboundEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
    private readonly tenantResolver: TenantResolverService,
    private readonly routingService: DepartmentRoutingService,
    private readonly ticketsService: TicketsService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Saves decoded email attachments to local storage under tenant/ticket directories.
   */
  private saveAttachments(
    tenantId: string,
    ticketId: string,
    attachments?: InboundEmailAttachment[]
  ): SavedAttachmentInfo[] {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    const saved: SavedAttachmentInfo[] = [];

    try {
      const uploadDir = path.join(
        process.cwd(),
        'uploads',
        'tenants',
        tenantId,
        'tickets',
        ticketId,
        'attachments'
      );

      fs.mkdirSync(uploadDir, { recursive: true });

      for (const att of attachments) {
        if (!att || !att.content) continue;

        // Sanitize file name to avoid path traversal
        const safeBaseName = (att.fileName || 'attachment')
          .replace(/[/\\?%*:|"<>]/g, '_')
          .slice(0, 100);

        const uniqueFileName = `${Date.now()}_${safeBaseName}`;
        const targetPath = path.join(uploadDir, uniqueFileName);

        const buffer = Buffer.from(att.content, 'base64');
        fs.writeFileSync(targetPath, buffer);

        const relativePath = path.relative(process.cwd(), targetPath).replace(/\\/g, '/');

        saved.push({
          fileName: att.fileName || safeBaseName,
          contentType: att.contentType || 'application/octet-stream',
          size: buffer.length,
          filePath: relativePath,
          savedAt: new Date().toISOString(),
        });
      }

      this.logger.log(`[InboundEmail] Saved ${saved.length} attachment(s) for ticket ${ticketId}`);
    } catch (err: any) {
      this.logger.error({ error: err.message }, `[InboundEmail] Failed to save attachments for ticket ${ticketId}`);
    }

    return saved;
  }

  /**
   * Complete business workflow for ingesting a verified real inbound email.
   */
  async processInboundEmail(parsed: ParsedInboundEmail): Promise<InboundEmailProcessResult> {
    this.logger.log(
      `[InboundEmail] Processing incoming email from '${parsed.fromEmail}' to '${parsed.toEmail}' (Message-ID: ${parsed.messageId})`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Strict Multi-Tenant Recipient Resolution
    // ─────────────────────────────────────────────────────────────────────────
    const resolvedTenantInfo = await this.tenantResolver.resolveTenantFromRecipients(
      parsed.allRecipients.length > 0 ? parsed.allRecipients : [parsed.toEmail]
    );

    if (!resolvedTenantInfo) {
      this.logger.warn(
        `[InboundEmail] Recipient '${parsed.toEmail}' does not belong to any configured active tenant. Ignoring email safely without creating any tenant or ticket.`
      );
      return {
        status: 'REJECTED_UNKNOWN_RECIPIENT',
        messageId: parsed.messageId,
        reason: `Recipient email does not belong to any configured tenant`,
      };
    }

    const { tenant, emailConfig } = resolvedTenantInfo;

    // Check if email integration is explicitly enabled for this tenant
    if (!emailConfig.enabled) {
      this.logger.warn(
        `[InboundEmail] Inbound email support is disabled for tenant '${tenant.name}' (${tenant.slug}). Ignoring.`
      );
      return {
        status: 'REJECTED_DISABLED_TENANT',
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        messageId: parsed.messageId,
        reason: `Email support is currently disabled for tenant ${tenant.name}`,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Idempotency Verification
    // ─────────────────────────────────────────────────────────────────────────
    const existingEmail = await this.prisma.inboundEmail.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { messageId: parsed.messageId },
          ...(parsed.providerEventId ? [{ providerEventId: parsed.providerEventId }] : []),
        ],
      },
      include: {
        ticket: {
          select: { id: true, ticketNumber: true },
        },
      },
    });

    if (existingEmail) {
      this.logger.log(
        `[InboundEmail] Idempotent duplicate detected for Message-ID '${parsed.messageId}' in tenant '${tenant.slug}'. Ticket #${existingEmail.ticket?.ticketNumber || existingEmail.ticketId}`
      );
      return {
        status: 'IDEMPOTENT_IGNORED',
        ticketId: existingEmail.ticketId || undefined,
        ticketNumber: existingEmail.ticket?.ticketNumber || undefined,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        messageId: parsed.messageId,
        reason: 'Duplicate email already ingested idempotently',
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Execute within AsyncLocalStorage Tenant Context
    // ─────────────────────────────────────────────────────────────────────────
    const tenantContext: TenantContext = {
      tenantId: tenant.id,
      userId: '',
      roles: [SystemRole.CUSTOMER],
      permissions: [],
      isSuperAdmin: false,
    };

    return this.tenantContextService.runWithContext(tenantContext, async () => {
      // ───────────────────────────────────────────────────────────────────────
      // STEP 4: Scoped Customer Lookup / Creation (Strictly within resolvedTenant)
      // ───────────────────────────────────────────────────────────────────────
      const normalizedFromEmail = parsed.fromEmail.toLowerCase().trim();
      let customer = await this.prisma.customer.findFirst({
        where: {
          tenantId: tenant.id,
          email: { equals: normalizedFromEmail, mode: 'insensitive' },
          deletedAt: null,
        },
      });

      if (!customer) {
        if (!emailConfig.autoCreateTicket) {
          this.logger.warn(
            `[InboundEmail] Auto-create tickets is disabled for tenant '${tenant.slug}', and customer '${normalizedFromEmail}' does not exist.`
          );
          return {
            status: 'REJECTED_DISABLED_TENANT',
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            messageId: parsed.messageId,
            reason: 'Auto ticket creation is disabled and sender is not an existing registered customer',
          };
        }

        // Automatic customer creation inside resolved tenant
        const rawLocal = normalizedFromEmail.split('@')[0] || 'Customer';
        const contactPerson =
          parsed.fromName?.trim() ||
          rawLocal.replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        const companyName = `${contactPerson} (Email Customer)`;

        customer = await this.prisma.customer.create({
          data: {
            tenantId: tenant.id,
            companyName,
            contactPerson,
            email: normalizedFromEmail,
            phone: 'N/A',
            status: 'ACTIVE',
            notes: 'Auto-provisioned via inbound email support channel',
          },
        });

        this.logger.log(
          `[InboundEmail] Customer '${customer.contactPerson}' (${customer.id}) auto-created under tenant '${tenant.slug}'`
        );

        await this.auditService.record({
          tenantId: tenant.id,
          actorId: null,
          eventType: AuditEventType.CUSTOMER_CREATED,
          resourceType: 'CUSTOMER',
          resourceId: customer.id,
          action: 'INBOUND_EMAIL_CUSTOMER_PROVISIONED',
          metadata: {
            email: customer.email,
            contactPerson: customer.contactPerson,
            source: 'EMAIL_INBOUND',
          },
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // STEP 5: Threading & Existing Ticket Reply Detection
      // ───────────────────────────────────────────────────────────────────────
      const ticketNumberMatch = parsed.subject.match(/\b(KAL-\d{4}-\d{4,})\b/i);
      if (ticketNumberMatch && ticketNumberMatch[1]) {
        const potentialTicketNumber = ticketNumberMatch[1].toUpperCase();
        const existingTicket = await this.prisma.serviceTicket.findFirst({
          where: {
            tenantId: tenant.id,
            ticketNumber: potentialTicketNumber,
            deletedAt: null,
          },
        });

        if (existingTicket) {
          this.logger.log(
            `[InboundEmail] Email identified as a reply to existing ticket #${existingTicket.ticketNumber} in tenant '${tenant.slug}'`
          );

          // Save attachments if any
          const savedAttachments = this.saveAttachments(
            tenant.id,
            existingTicket.id,
            parsed.attachments
          );

          let attachmentSummaryText = '';
          if (savedAttachments.length > 0) {
            attachmentSummaryText =
              `\n\n📎 Attachments (${savedAttachments.length}):\n` +
              savedAttachments
                .map(
                  (a) =>
                    `• ${a.fileName} (${a.contentType}, ${(a.size / 1024).toFixed(1)} KB)`
                )
                .join('\n');
          }

          // Append reply as timeline note to existing ticket
          await this.ticketsService.addNote(tenant.id, existingTicket.id, null, {
            note: `[Inbound Email Reply from ${parsed.fromName || parsed.fromEmail} <${normalizedFromEmail}>]\n\n${parsed.bodyText || parsed.bodyHtml || '(No text content)'}${attachmentSummaryText}`,
          });

          // Save EmailMessage record
          await this.prisma.emailMessage.create({
            data: {
              tenantId: tenant.id,
              ticketId: existingTicket.id,
              provider: parsed.provider,
              providerMessageId: parsed.messageId,
              messageId: parsed.messageId,
              inReplyTo: parsed.inReplyTo || null,
              references: parsed.references ? parsed.references.join(', ') : null,
              fromEmail: normalizedFromEmail,
              toEmail: parsed.toEmail,
              subject: parsed.subject,
              bodyText: parsed.bodyText,
              bodyHtml: parsed.bodyHtml || null,
              direction: 'INBOUND',
              processingStatus: 'PROCESSED',
            },
          });

          // Save InboundEmail record linked to existing ticket
          await this.prisma.inboundEmail.create({
            data: {
              tenantId: tenant.id,
              ticketId: existingTicket.id,
              provider: parsed.provider,
              providerEventId: parsed.providerEventId,
              messageId: parsed.messageId,
              fromEmail: normalizedFromEmail,
              fromName: parsed.fromName,
              toEmail: parsed.toEmail,
              subject: parsed.subject,
              bodyText: parsed.bodyText,
              bodyHtml: parsed.bodyHtml,
              inReplyTo: parsed.inReplyTo,
              threadId: existingTicket.id,
              rawPayload: {
                ...((parsed.rawPayload as any) || {}),
                savedAttachments,
              },
            },
          });

          return {
            status: 'THREAD_REPLY_RECORDED',
            ticketId: existingTicket.id,
            ticketNumber: existingTicket.ticketNumber,
            customerId: customer.id,
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            messageId: parsed.messageId,
          };
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // STEP 6: Department & Priority Classification
      // ───────────────────────────────────────────────────────────────────────
      let routedDepartmentId: string | undefined;
      let ticketPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

      if (emailConfig.autoRoute) {
        const routing = await this.routingService.routeInboundEmail(
          tenant.id,
          parsed.subject,
          parsed.bodyText
        );
        routedDepartmentId = routing.departmentId;
        ticketPriority = routing.priority;
      }

      // ───────────────────────────────────────────────────────────────────────
      // STEP 7: Create Ticket using Existing TicketService
      // ───────────────────────────────────────────────────────────────────────
      const createdTicket = await this.ticketsService.createTicket(tenant.id, null, {
        title: parsed.subject.trim() || 'Inbound Support Request',
        description: parsed.bodyText.trim() || parsed.bodyHtml?.trim() || '(No body provided)',
        priority: ticketPriority,
        raisedBy: 'CUSTOMER',
        raisedForCustomerId: customer.id,
        departmentId: routedDepartmentId,
        source: 'EMAIL',
      });

      this.logger.log(
        `[InboundEmail] Created ticket #${createdTicket.ticketNumber} (${createdTicket.id}) for tenant '${tenant.name}' [Source: EMAIL, Priority: ${ticketPriority}]`
      );

      // ───────────────────────────────────────────────────────────────────────
      // STEP 8: Save Attachments to Storage System
      // ───────────────────────────────────────────────────────────────────────
      const savedAttachments = this.saveAttachments(
        tenant.id,
        createdTicket.id,
        parsed.attachments
      );

      let attachmentSummaryText = '';
      if (savedAttachments.length > 0) {
        attachmentSummaryText =
          `\n\n📎 Attachments (${savedAttachments.length}):\n` +
          savedAttachments
            .map(
              (a) =>
                `• ${a.fileName} (${a.contentType}, ${(a.size / 1024).toFixed(1)} KB)`
            )
            .join('\n');
      }

      // ───────────────────────────────────────────────────────────────────────
      // STEP 9: Save Email as First Ticket Message in Timeline & EmailMessage Table
      // ───────────────────────────────────────────────────────────────────────
      await this.ticketsService.addNote(tenant.id, createdTicket.id, null, {
        note: `[Inbound Email from ${parsed.fromName || parsed.fromEmail} <${normalizedFromEmail}>]\n\n${parsed.bodyText || parsed.bodyHtml || '(No text content)'}${attachmentSummaryText}`,
      });

      await this.prisma.emailMessage.create({
        data: {
          tenantId: tenant.id,
          ticketId: createdTicket.id,
          provider: parsed.provider,
          providerMessageId: parsed.messageId,
          messageId: parsed.messageId,
          inReplyTo: parsed.inReplyTo || null,
          references: parsed.references ? parsed.references.join(', ') : null,
          fromEmail: normalizedFromEmail,
          toEmail: parsed.toEmail,
          subject: parsed.subject,
          bodyText: parsed.bodyText,
          bodyHtml: parsed.bodyHtml || null,
          direction: 'INBOUND',
          processingStatus: 'PROCESSED',
        },
      });

      // ───────────────────────────────────────────────────────────────────────
      // STEP 10: Persist InboundEmail Record Linked to Tenant and Ticket
      // ───────────────────────────────────────────────────────────────────────
      await this.prisma.inboundEmail.create({
        data: {
          tenantId: tenant.id,
          ticketId: createdTicket.id,
          provider: parsed.provider,
          providerEventId: parsed.providerEventId,
          messageId: parsed.messageId,
          fromEmail: normalizedFromEmail,
          fromName: parsed.fromName,
          toEmail: parsed.toEmail,
          subject: parsed.subject,
          bodyText: parsed.bodyText,
          bodyHtml: parsed.bodyHtml,
          inReplyTo: parsed.inReplyTo,
          threadId: parsed.threadId,
          rawPayload: {
            ...((parsed.rawPayload as any) || {}),
            savedAttachments,
          },
        },
      });

      return {
        status: 'TICKET_CREATED',
        ticketId: createdTicket.id,
        ticketNumber: createdTicket.ticketNumber,
        customerId: customer.id,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        messageId: parsed.messageId,
      };
    });
  }
}
