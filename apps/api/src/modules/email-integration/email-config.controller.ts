import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { TenantContext, UserPrincipal, PermissionCode, AuditEventType } from '@kalpak/types';
import { UpdateEmailConfigDto } from './dto/email-config.dto';
import { AuditService } from '../audit/audit.service';
import { EmailConnectionStatus } from '@kalpak/database';

@ApiTags('Tenant Email Configuration')
@ApiBearerAuth()
@Controller('tenants/email-config')
export class EmailConfigController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

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

  @Get()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get current tenant email integration configuration & connection info' })
  @ApiResponse({ status: 200, description: 'Email configuration retrieved successfully' })
  async getEmailConfiguration(@CurrentTenant() tenantCtx: TenantContext) {
    return this.withTenant(tenantCtx.tenantId, false, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantCtx.tenantId },
        include: {
          emailConfiguration: true,
          emailConnection: true,
        },
      });

      if (!tenant) throw new NotFoundException('Tenant not found');

      const connection = tenant.emailConnection;
      const connectedEmail = connection?.emailAddress || tenant.emailConfiguration?.supportEmail || `support@${tenant.slug}.com`;

      // Initialize default email configuration if not yet created
      let emailConfig = tenant.emailConfiguration;
      if (!emailConfig) {
        emailConfig = await tx.emailConfiguration.create({
          data: {
            tenantId: tenant.id,
            supportEmail: connectedEmail,
            provider: 'CLOUDMAILIN',
            enabled: true,
            autoCreateTicket: true,
            autoRoute: true,
            customerRepliesEnabled: true,
            unknownCustomerPolicy: 'AUTO_CREATE',
            defaultPriority: 'MEDIUM',
            status: 'ACTIVE',
            verifiedAt: new Date(),
            forwardingStatus: 'CONNECTED',
          },
        });
      } else if (!emailConfig.verifiedAt || emailConfig.provider !== 'CLOUDMAILIN' || emailConfig.forwardingStatus !== 'CONNECTED') {
        emailConfig = await tx.emailConfiguration.update({
          where: { id: emailConfig.id },
          data: {
            verifiedAt: emailConfig.verifiedAt || new Date(),
            provider: 'CLOUDMAILIN',
            forwardingStatus: 'CONNECTED',
            status: 'ACTIVE',
          },
        });
      }

      // Ensure primary supportEmail exists in support_emails table and is VERIFIED
      if (emailConfig.supportEmail) {
        const existingSupport = await tx.supportEmail.findFirst({
          where: { tenantId: tenant.id, email: emailConfig.supportEmail },
        });
        if (!existingSupport) {
          await tx.supportEmail.create({
            data: {
              tenantId: tenant.id,
              email: emailConfig.supportEmail,
              displayName: `${tenant.name} Support`,
              isDefault: true,
              isActive: true,
              verificationStatus: 'VERIFIED',
              verifiedAt: new Date(),
            },
          });
        } else if (existingSupport.verificationStatus !== 'VERIFIED') {
          await tx.supportEmail.update({
            where: { id: existingSupport.id },
            data: {
              verificationStatus: 'VERIFIED',
              verifiedAt: existingSupport.verifiedAt || new Date(),
              isActive: true,
            },
          });
        }
      }

      // Fetch recent email messages for this tenant (both inbound and outbound)
      const recentMessages = await tx.emailMessage.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              status: true,
              priority: true,
              department: { select: { name: true, code: true } },
            },
          },
        },
      });

      return {
        emailConfig,
        inboundDetails: {
          provider: 'CLOUDMAILIN',
          providerInboundAddress: 'c5e1f5045bfd98846d8e@cloudmailin.net',
          webhookUrl: 'https://guitar-std-bangkok-shots.trycloudflare.com/webhooks/cloudmailin',
          webhookSecretConfigured: false,
          status: 'ACTIVE',
        },
        connection: {
          isConnected: connection?.status === EmailConnectionStatus.CONNECTED,
          status: connection?.status || EmailConnectionStatus.DISCONNECTED,
          emailAddress: connection?.emailAddress || null,
          lastSyncAt: connection?.lastSyncAt || null,
          provider: connection?.provider || 'CLOUDMAILIN',
        },
        recentInboundEmails: recentMessages
          .filter((m) => m.direction === 'INBOUND')
          .map((m) => ({
            id: m.id,
            fromEmail: m.fromEmail,
            fromName: m.fromEmail,
            toEmail: m.toEmail,
            subject: m.subject,
            ticketId: m.ticketId,
            ticketNumber: m.ticket?.ticketNumber,
            departmentName: m.ticket?.department?.name,
            receivedAt: m.receivedAt.toISOString(),
            createdAt: m.createdAt.toISOString(),
          })),
        recentMessages: recentMessages.map((m) => ({
          id: m.id,
          ticketId: m.ticketId,
          ticketNumber: m.ticket?.ticketNumber,
          departmentName: m.ticket?.department?.name,
          ticketStatus: m.ticket?.status,
          fromEmail: m.fromEmail,
          toEmail: m.toEmail,
          subject: m.subject,
          direction: m.direction,
          processingStatus: m.processingStatus,
          receivedAt: m.receivedAt,
          createdAt: m.createdAt,
        })),
      };
    });
  }

  @Put()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Update tenant email integration settings' })
  @ApiResponse({ status: 200, description: 'Email configuration updated successfully' })
  async updateEmailConfiguration(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: UpdateEmailConfigDto
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantCtx.tenantId },
      include: { emailConnection: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const supportEmail =
      dto.supportEmail?.toLowerCase().trim() ||
      tenant.emailConnection?.emailAddress ||
      `support@${tenant.slug}.com`;

    // Ensure no other tenant registered the exact same support email
    if (dto.supportEmail) {
      const duplicate = await this.prisma.emailConfiguration.findFirst({
        where: {
          supportEmail: { equals: supportEmail, mode: 'insensitive' },
          tenantId: { not: tenantCtx.tenantId },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Support email address '${supportEmail}' is already configured by another organization.`
        );
      }
    }

    const updated = await this.withTenant(tenantCtx.tenantId, false, async (tx) => {
      const updatedRecord = await tx.emailConfiguration.upsert({
        where: { tenantId: tenantCtx.tenantId },
        update: {
          supportEmail,
          provider: 'CLOUDMAILIN',
          enabled: dto.enabled ?? true,
          autoCreateTicket: dto.autoCreateTicket ?? true,
          autoRoute: dto.autoRoute ?? true,
          customerRepliesEnabled: dto.customerRepliesEnabled ?? true,
          unknownCustomerPolicy: dto.unknownCustomerPolicy || 'AUTO_CREATE',
          defaultDepartmentId: dto.defaultDepartmentId ?? undefined,
          defaultPriority: dto.defaultPriority ?? 'MEDIUM',
          notifyTicketCreated: dto.notifyTicketCreated ?? true,
          notifyTicketAssigned: dto.notifyTicketAssigned ?? true,
          notifyTicketStatusChanged: dto.notifyTicketStatusChanged ?? true,
          notifyCustomerReply: dto.notifyCustomerReply ?? true,
          notifyTicketResolved: dto.notifyTicketResolved ?? true,
          notifyTicketClosed: dto.notifyTicketClosed ?? true,
          notifyLongOpenTicket: dto.notifyLongOpenTicket ?? true,
          status: (dto.enabled ?? true) ? 'ACTIVE' : 'DISABLED',
          verifiedAt: new Date(),
          forwardingStatus: 'CONNECTED',
        },
        create: {
          tenantId: tenantCtx.tenantId,
          supportEmail,
          provider: 'CLOUDMAILIN',
          enabled: dto.enabled ?? true,
          autoCreateTicket: dto.autoCreateTicket ?? true,
          autoRoute: dto.autoRoute ?? true,
          customerRepliesEnabled: dto.customerRepliesEnabled ?? true,
          unknownCustomerPolicy: dto.unknownCustomerPolicy || 'AUTO_CREATE',
          defaultDepartmentId: dto.defaultDepartmentId ?? undefined,
          defaultPriority: dto.defaultPriority ?? 'MEDIUM',
          notifyTicketCreated: dto.notifyTicketCreated ?? true,
          notifyTicketAssigned: dto.notifyTicketAssigned ?? true,
          notifyTicketStatusChanged: dto.notifyTicketStatusChanged ?? true,
          notifyCustomerReply: dto.notifyCustomerReply ?? true,
          notifyTicketResolved: dto.notifyTicketResolved ?? true,
          notifyTicketClosed: dto.notifyTicketClosed ?? true,
          notifyLongOpenTicket: dto.notifyLongOpenTicket ?? true,
          status: (dto.enabled ?? true) ? 'ACTIVE' : 'DISABLED',
          verifiedAt: new Date(),
          forwardingStatus: 'CONNECTED',
        },
      });

      // Automatically register and verify in SupportEmail table
      if (dto.supportEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(supportEmail);

        // Unset default on other entries
        await tx.supportEmail.updateMany({
          where: { tenantId: tenantCtx.tenantId, isDefault: true },
          data: { isDefault: false },
        });

        const existingSupport = await tx.supportEmail.findFirst({
          where: { tenantId: tenantCtx.tenantId, email: supportEmail },
        });

        if (!existingSupport) {
          await tx.supportEmail.create({
            data: {
              tenantId: tenantCtx.tenantId,
              email: supportEmail,
              displayName: `${tenant.name} Support`,
              isDefault: true,
              isActive: true,
              verificationStatus: isValid ? 'VERIFIED' : 'PENDING',
              verifiedAt: isValid ? new Date() : null,
            },
          });
        } else {
          await tx.supportEmail.update({
            where: { id: existingSupport.id },
            data: {
              isDefault: true,
              isActive: true,
              verificationStatus: isValid ? 'VERIFIED' : existingSupport.verificationStatus,
              verifiedAt: isValid ? (existingSupport.verifiedAt || new Date()) : existingSupport.verifiedAt,
            },
          });
        }
      }

      return updatedRecord;
    });

    await this.auditService.record({
      tenantId: tenantCtx.tenantId,
      actorId: user.id,
      eventType: AuditEventType.TENANT_UPDATED,
      resourceType: 'EMAIL_CONFIGURATION',
      resourceId: updated.id,
      action: 'UPDATE_EMAIL_CONFIGURATION',
      metadata: {
        supportEmail: updated.supportEmail,
        enabled: updated.enabled,
        autoCreateTicket: updated.autoCreateTicket,
        customerRepliesEnabled: updated.customerRepliesEnabled,
        unknownCustomerPolicy: updated.unknownCustomerPolicy,
        defaultDepartmentId: updated.defaultDepartmentId,
        defaultPriority: updated.defaultPriority,
      },
    });

    return updated;
  }
}
