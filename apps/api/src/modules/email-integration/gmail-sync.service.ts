import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { GmailEmailProvider, GoogleTokenData, ParsedGmailMessage } from './providers/gmail.provider';
import { TicketsService } from '../tickets/tickets.service';
import { DepartmentRoutingService } from './department-routing.service';
import { AuditService } from '../audit/audit.service';
import { encryptSecret, decryptSecret } from '@kalpak/auth';
import { getConfig } from '@kalpak/config';
import { TenantContext, SystemRole, AuditEventType } from '@kalpak/types';
import { EmailConnection, EmailConnectionStatus, TicketPriority } from '@kalpak/database';

@Injectable()
export class GmailSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GmailSyncService.name);
  private readonly config = getConfig();
  private pollIntervalTimer: NodeJS.Timeout | null = null;
  private isPollingActive = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
    private readonly gmailProvider: GmailEmailProvider,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    private readonly routingService: DepartmentRoutingService,
    private readonly auditService: AuditService
  ) {}

  onModuleInit() {
    if (this.config.EMAIL_PROVIDER !== 'gmail') {
      this.logger.log(
        `[GmailSyncService] Background Gmail polling disabled (active EMAIL_PROVIDER is '${this.config.EMAIL_PROVIDER}')`
      );
      return;
    }

    this.logger.log('Initializing Gmail scheduled sync service (Polling interval: 60s)...');
    // Run scheduled sync every 60 seconds
    this.pollIntervalTimer = setInterval(async () => {
      if (this.isPollingActive) {
        return;
      }
      this.isPollingActive = true;
      try {
        await this.syncAllConnectedMailboxes();
      } catch (err) {
        this.logger.error(`Error during scheduled Gmail sync: ${err}`);
      } finally {
        this.isPollingActive = false;
      }
    }, 60000);
  }

  onModuleDestroy() {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
  }

  private get encryptionKey(): string {
    return this.config.SESSION_SECRET || 'kalpak_default_secure_token_encryption_key_32_chars';
  }

  /**
   * Safe execution wrapper supporting Prisma withTenantContext when available,
   * falling back to standard client when running in unit tests with mock prisma.
   */
  private async withTenant<T>(
    tenantId: string | null,
    isSuperAdmin: boolean,
    op: (prisma: PrismaService) => Promise<T>
  ): Promise<T> {
    if (typeof (this.prisma as any).withTenantContext === 'function') {
      return (this.prisma as any).withTenantContext(tenantId, isSuperAdmin, op);
    }
    return op(this.prisma);
  }

  /**
   * Helper to encrypt token payload.
   */
  encryptTokens(data: GoogleTokenData): string {
    return encryptSecret(JSON.stringify(data), this.encryptionKey);
  }

  /**
   * Helper to decrypt token payload.
   */
  decryptTokens(encrypted: string): GoogleTokenData {
    const raw = decryptSecret(encrypted, this.encryptionKey);
    return JSON.parse(raw);
  }

  /**
   * Validates and returns a fresh access token, refreshing automatically if near expiry.
   */
  async getValidAccessToken(connection: EmailConnection): Promise<string> {
    const tokens = this.decryptTokens(connection.encryptedTokenData);

    // Refresh if within 2 minutes of expiry
    const isExpiringSoon = Date.now() >= (tokens.expiryDate - 120000);

    if (isExpiringSoon && tokens.refreshToken) {
      this.logger.log(`Refreshing access token for tenant ${connection.tenantId} (${connection.emailAddress})...`);
      try {
        const refreshed = await this.gmailProvider.refreshAccessToken(tokens.refreshToken);
        tokens.accessToken = refreshed.accessToken;
        tokens.expiryDate = refreshed.expiryDate;

        const updatedEncrypted = this.encryptTokens(tokens);
        await this.prisma.emailConnection.update({
          where: { id: connection.id },
          data: { encryptedTokenData: updatedEncrypted },
        });
      } catch (err) {
        this.logger.error(`Failed to refresh token for ${connection.emailAddress}: ${err}`);
        await this.prisma.emailConnection.update({
          where: { id: connection.id },
          data: { status: EmailConnectionStatus.EXPIRED },
        });
        throw err;
      }
    }

    return tokens.accessToken;
  }

  /**
   * Scans and syncs all connected Gmail mailboxes across tenants.
   * Runs under system context (isSuperAdmin = true) to discover each tenant's mailbox.
   */
  async syncAllConnectedMailboxes(): Promise<void> {
    const connections = await this.withTenant(null, true, async (tx) => {
      return tx.emailConnection.findMany({
        where: { status: EmailConnectionStatus.CONNECTED },
      });
    });

    if (!connections || connections.length === 0) {
      return;
    }

    this.logger.debug(`[GmailSync] Polling ${connections.length} connected tenant mailbox(es)...`);

    for (const conn of connections) {
      try {
        await this.syncTenantMailbox(conn.tenantId);
      } catch (err) {
        this.logger.error(`Failed syncing tenant ${conn.tenantId} mailbox: ${err}`);
      }
    }
  }

  /**
   * Synchronizes incoming emails for a specific tenant's connected Gmail mailbox.
   * Every operation is strictly executed within that tenant's RLS and TenantContext.
   */
  async syncTenantMailbox(tenantId: string): Promise<{ syncedCount: number; errors: string[] }> {
    const connection = await this.withTenant(tenantId, false, async (tx) => {
      return tx.emailConnection.findFirst({
        where: { tenantId, status: EmailConnectionStatus.CONNECTED },
      });
    });

    if (!connection) {
      return { syncedCount: 0, errors: ['No active Gmail connection found for this tenant'] };
    }

    const emailConfig = await this.withTenant(tenantId, false, async (tx) => {
      return tx.emailConfiguration.findUnique({
        where: { tenantId },
      });
    });

    if (emailConfig && !emailConfig.enabled) {
      this.logger.warn(`Email integration is disabled for tenant ${tenantId}`);
      return { syncedCount: 0, errors: ['Email integration is disabled in tenant settings'] };
    }

    let accessToken: string;
    try {
      accessToken = await this.getValidAccessToken(connection);
    } catch (err: any) {
      return { syncedCount: 0, errors: [err?.message || 'Failed retrieving valid access token'] };
    }

    // Fetch incoming messages from Gmail
    let messages: ParsedGmailMessage[];
    try {
      messages = await this.gmailProvider.fetchNewMessages(accessToken, 'label:INBOX');
    } catch (err: any) {
      this.logger.error(`Failed fetching messages from Gmail API for ${connection.emailAddress}: ${err}`);
      return { syncedCount: 0, errors: [err?.message || 'Gmail fetch failed'] };
    }

    if (messages.length === 0) {
      await this.withTenant(tenantId, false, async (tx) => {
        await tx.emailConnection.update({
          where: { id: connection.id },
          data: { lastSyncAt: new Date() },
        });
      });
      return { syncedCount: 0, errors: [] };
    }

    // Execute within strict multi-tenant context
    const tenantContext: TenantContext = {
      tenantId,
      userId: '',
      roles: [SystemRole.CUSTOMER],
      permissions: [],
      isSuperAdmin: false,
    };

    return this.tenantContextService.runWithContext(tenantContext, async () => {
      let syncedCount = 0;
      const errors: string[] = [];

      for (const msg of messages) {
        try {
          // ─────────────────────────────────────────────────────────────────
          // 1. Idempotency & Duplicate Prevention
          // ─────────────────────────────────────────────────────────────────
          const existing = await this.prisma.emailMessage.findFirst({
            where: {
              tenantId,
              providerMessageId: msg.providerMessageId,
            },
          });

          if (existing) {
            continue; // Already processed
          }

          // Ignore emails sent by the mailbox itself to prevent loops
          if (msg.fromEmail.toLowerCase() === connection.emailAddress.toLowerCase()) {
            continue;
          }

          // ─────────────────────────────────────────────────────────────────
          // 2. Resolve or Provision Customer Scoped to Tenant
          // ─────────────────────────────────────────────────────────────────
          let customer = await this.prisma.customer.findFirst({
            where: {
              tenantId,
              email: msg.fromEmail,
              deletedAt: null,
            },
          });

          if (!customer) {
            if (emailConfig?.unknownCustomerPolicy === 'REQUIRE_APPROVAL') {
              this.logger.warn(
                `Unknown customer ${msg.fromEmail} encountered and unknownCustomerPolicy is REQUIRE_APPROVAL. Skipping auto ticket.`
              );
              await this.prisma.emailMessage.create({
                data: {
                  tenantId,
                  provider: 'GMAIL',
                  providerMessageId: msg.providerMessageId,
                  messageId: msg.messageId,
                  inReplyTo: msg.inReplyTo,
                  references: msg.references,
                  fromEmail: msg.fromEmail,
                  toEmail: msg.toEmail,
                  ccEmail: msg.ccEmail,
                  subject: msg.subject,
                  bodyText: msg.bodyText,
                  bodyHtml: msg.bodyHtml,
                  direction: 'INBOUND',
                  processingStatus: 'PENDING',
                  receivedAt: msg.receivedAt,
                },
              });
              continue;
            }

            // Auto-create customer under this tenant
            const rawLocal = msg.fromEmail.split('@')[0] || 'Customer';
            const contactPerson =
              msg.fromName?.trim() ||
              rawLocal.replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            const companyName = `${contactPerson} (Customer)`;

            customer = await this.prisma.customer.create({
              data: {
                tenantId,
                companyName,
                contactPerson,
                email: msg.fromEmail,
                phone: 'N/A',
                status: 'ACTIVE',
                notes: 'Auto-provisioned via Gmail Email-to-Ticket',
              },
            });

            await this.auditService.record({
              tenantId,
              actorId: null,
              eventType: AuditEventType.CUSTOMER_CREATED,
              resourceType: 'CUSTOMER',
              resourceId: customer.id,
              action: 'GMAIL_INBOUND_CUSTOMER_PROVISIONED',
              metadata: {
                email: customer.email,
                contactPerson: customer.contactPerson,
                source: 'GMAIL_INTEGRATION',
              },
            });
          }

          // ─────────────────────────────────────────────────────────────────
          // 3. Threading & Existing Ticket Reply Detection
          // ─────────────────────────────────────────────────────────────────
          let matchedTicket: any = null;

          // A. Check ticket number in Subject (e.g. KAL-2026-0001, TK-10001, [KAL-2026-0001])
          const ticketNumberMatch = msg.subject.match(/\b((?:KAL-\d{4}-\d{4,})|(?:TK-\d{4,}))\b/i);
          if (ticketNumberMatch && ticketNumberMatch[1]) {
            const detectedNumber = ticketNumberMatch[1].toUpperCase();
            matchedTicket = await this.prisma.serviceTicket.findFirst({
              where: {
                tenantId,
                ticketNumber: detectedNumber,
                deletedAt: null,
              },
            });
          }

          // B. Check In-Reply-To and References against EmailMessage table
          if (!matchedTicket && (msg.inReplyTo || msg.references)) {
            const candidateIds: string[] = [];
            if (msg.inReplyTo) candidateIds.push(msg.inReplyTo);
            if (msg.references) {
              const refs = msg.references.split(/\s+/).map((r) => r.trim()).filter(Boolean);
              candidateIds.push(...refs);
            }

            const matchedMessage = await this.prisma.emailMessage.findFirst({
              where: {
                tenantId,
                messageId: { in: candidateIds },
                ticketId: { not: null },
              },
              select: { ticketId: true },
            });

            if (matchedMessage?.ticketId) {
              matchedTicket = await this.prisma.serviceTicket.findFirst({
                where: {
                  tenantId,
                  id: matchedMessage.ticketId,
                  deletedAt: null,
                },
              });
            }
          }

          // ─────────────────────────────────────────────────────────────────
          // 4. Handle Customer Reply vs New Ticket Creation
          // ─────────────────────────────────────────────────────────────────
          if (matchedTicket && (emailConfig?.customerRepliesEnabled ?? true)) {
            this.logger.log(
              `[GmailSync] Message is a reply to existing Ticket #${matchedTicket.ticketNumber} (ID: ${matchedTicket.id})`
            );

            // Record EmailMessage linked to existing ticket
            await this.prisma.emailMessage.create({
              data: {
                tenantId,
                ticketId: matchedTicket.id,
                provider: 'GMAIL',
                providerMessageId: msg.providerMessageId,
                messageId: msg.messageId,
                inReplyTo: msg.inReplyTo,
                references: msg.references,
                fromEmail: msg.fromEmail,
                toEmail: msg.toEmail,
                ccEmail: msg.ccEmail,
                subject: msg.subject,
                bodyText: msg.bodyText,
                bodyHtml: msg.bodyHtml,
                direction: 'INBOUND',
                processingStatus: 'PROCESSED',
                receivedAt: msg.receivedAt,
              },
            });

            // Append reply as timeline note to ticket
            await this.ticketsService.addNote(tenantId, matchedTicket.id, null, {
              note: `[Email Reply from ${msg.fromEmail}]\n\n${msg.bodyText || '(No plain text content)'}`,
            });

            // If ticket was awaiting customer, automatically restore to IN_PROGRESS
            if (matchedTicket.status === 'AWAITING_CUSTOMER') {
              await this.ticketsService.updateStatus(tenantId, matchedTicket.id, '', {
                status: 'IN_PROGRESS',
                note: 'Customer responded via email reply',
              });
            }

            // Mark processed reply in Gmail (remove UNREAD label)
            await this.gmailProvider.modifyMessageLabels(accessToken, msg.providerMessageId, {
              removeLabelIds: ['UNREAD'],
            });

            syncedCount++;
          } else {
            // New ticket creation
            if (emailConfig && !emailConfig.autoCreateTicket) {
              this.logger.warn(`Auto-create ticket is disabled for tenant ${tenantId}. Skipping ticket creation.`);
              await this.prisma.emailMessage.create({
                data: {
                  tenantId,
                  provider: 'GMAIL',
                  providerMessageId: msg.providerMessageId,
                  messageId: msg.messageId,
                  inReplyTo: msg.inReplyTo,
                  references: msg.references,
                  fromEmail: msg.fromEmail,
                  toEmail: msg.toEmail,
                  ccEmail: msg.ccEmail,
                  subject: msg.subject,
                  bodyText: msg.bodyText,
                  bodyHtml: msg.bodyHtml,
                  direction: 'INBOUND',
                  processingStatus: 'IGNORED',
                  receivedAt: msg.receivedAt,
                },
              });
              continue;
            }

            // Determine Department and Priority
            let departmentId = emailConfig?.defaultDepartmentId || undefined;
            let priority: TicketPriority = emailConfig?.defaultPriority || TicketPriority.MEDIUM;

            if (emailConfig?.autoRoute) {
              try {
                const routing = await this.routingService.routeInboundEmail(
                  tenantId,
                  msg.subject,
                  msg.bodyText
                );
                if (routing.departmentId) departmentId = routing.departmentId;
                if (routing.priority) priority = routing.priority as TicketPriority;
              } catch (routeErr) {
                this.logger.warn(`Auto-route error, using default: ${routeErr}`);
              }
            }

            // Create ticket via TicketsService
            const createdTicket = await this.ticketsService.createTicket(tenantId, null, {
              title: msg.subject.trim() || 'Inbound Support Request',
              description: msg.bodyText.trim() || msg.bodyHtml?.trim() || '(No body provided)',
              priority,
              raisedBy: 'CUSTOMER',
              raisedForCustomerId: customer.id,
              departmentId,
              source: 'EMAIL',
            });

            this.logger.log(
              `[GmailSync] Created ticket #${createdTicket.ticketNumber} for customer ${customer.email} from email '${msg.subject}'`
            );

            // Store inbound EmailMessage linked to new ticket
            await this.prisma.emailMessage.create({
              data: {
                tenantId,
                ticketId: createdTicket.id,
                provider: 'GMAIL',
                providerMessageId: msg.providerMessageId,
                messageId: msg.messageId,
                inReplyTo: msg.inReplyTo,
                references: msg.references,
                fromEmail: msg.fromEmail,
                toEmail: msg.toEmail,
                ccEmail: msg.ccEmail,
                subject: msg.subject,
                bodyText: msg.bodyText,
                bodyHtml: msg.bodyHtml,
                direction: 'INBOUND',
                processingStatus: 'PROCESSED',
                receivedAt: msg.receivedAt,
              },
            });

            // ───────────────────────────────────────────────────────────────
            // 5. Send Real Acknowledgement Email via Gmail API
            // ───────────────────────────────────────────────────────────────
            if (emailConfig?.notifyTicketCreated ?? true) {
              try {
                const ackSubject = `[${createdTicket.ticketNumber}] Service Request Acknowledged: ${createdTicket.title}`;
                const ackHtml = `
                  <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; line-height: 1.5;">
                    <h2 style="color: #ea580c;">Service Request Received</h2>
                    <p>Dear ${customer.contactPerson || 'Customer'},</p>
                    <p>Thank you for reaching out. Your support request has been logged successfully in our system.</p>
                    <div style="background-color: #f8fafc; border-left: 4px solid #ea580c; padding: 12px 16px; margin: 16px 0;">
                      <p style="margin: 0;"><strong>Ticket Number:</strong> ${createdTicket.ticketNumber}</p>
                      <p style="margin: 4px 0 0;"><strong>Subject:</strong> ${createdTicket.title}</p>
                      <p style="margin: 4px 0 0;"><strong>Status:</strong> ${createdTicket.status}</p>
                      <p style="margin: 4px 0 0;"><strong>Priority:</strong> ${createdTicket.priority}</p>
                    </div>
                    <p>Our support team is reviewing your ticket and will assist you shortly. You can simply reply directly to this email to provide additional details or updates.</p>
                    <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
                      Best regards,<br/>
                      Customer Support Team
                    </p>
                  </div>
                `;

                const sent = await this.gmailProvider.sendEmail(accessToken, connection.emailAddress, {
                  to: msg.fromEmail,
                  subject: ackSubject,
                  bodyHtml: ackHtml,
                  inReplyTo: msg.messageId,
                  references: msg.messageId,
                });

                // Store outbound acknowledgement email message
                await this.prisma.emailMessage.create({
                  data: {
                    tenantId,
                    ticketId: createdTicket.id,
                    provider: 'GMAIL',
                    providerMessageId: sent.providerMessageId,
                    messageId: sent.messageId,
                    inReplyTo: msg.messageId,
                    references: msg.messageId,
                    fromEmail: connection.emailAddress,
                    toEmail: msg.fromEmail,
                    subject: ackSubject,
                    bodyHtml: ackHtml,
                    direction: 'OUTBOUND',
                    processingStatus: 'PROCESSED',
                    receivedAt: new Date(),
                  },
                });

                this.logger.log(
                  `[GmailSync] Real acknowledgement email dispatched to ${msg.fromEmail} for ticket #${createdTicket.ticketNumber}`
                );
              } catch (sendErr) {
                this.logger.error(`Failed sending acknowledgement email via Gmail API: ${sendErr}`);
              }
            }

            // Mark processed incoming email in Gmail (remove UNREAD label)
            await this.gmailProvider.modifyMessageLabels(accessToken, msg.providerMessageId, {
              removeLabelIds: ['UNREAD'],
            });

            syncedCount++;
          }
        } catch (msgErr: any) {
          this.logger.error(`Error processing Gmail message ${msg.providerMessageId}: ${msgErr}`);
          errors.push(msgErr?.message || 'Message processing failed');
        }
      }

      await this.withTenant(tenantId, false, async (tx) => {
        await tx.emailConnection.update({
          where: { id: connection.id },
          data: { lastSyncAt: new Date() },
        });
      });

      return { syncedCount, errors };
    });
  }
}
