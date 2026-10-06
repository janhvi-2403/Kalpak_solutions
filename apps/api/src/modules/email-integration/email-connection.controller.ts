import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { createHmac } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { TenantContext, UserPrincipal, PermissionCode, AuditEventType } from '@kalpak/types';
import { GmailEmailProvider } from './providers/gmail.provider';
import { GmailSyncService } from './gmail-sync.service';
import { AuditService } from '../audit/audit.service';
import { getConfig } from '@kalpak/config';
import { EmailConnectionStatus } from '@kalpak/database';

@ApiTags('Tenant Email Integration (Gmail & Google OAuth)')
@Controller('email-integration/gmail')
export class EmailConnectionController {
  private readonly config = getConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gmailProvider: GmailEmailProvider,
    private readonly gmailSyncService: GmailSyncService,
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

  private get hmacSecret(): string {
    return this.config.SESSION_SECRET || 'kalpak_oauth_state_hmac_secret_32_chars';
  }

  /**
   * Helper to sign state parameter for OAuth CSRF and tenant binding.
   */
  private generateStateToken(tenantId: string, userId: string): string {
    const payload = JSON.stringify({ tenantId, userId, t: Date.now() });
    const encodedPayload = Buffer.from(payload).toString('base64url');
    const signature = createHmac('sha256', this.hmacSecret).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  /**
   * Helper to verify and parse state parameter.
   */
  private verifyStateToken(state: string): { tenantId: string; userId: string } {
    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) {
      throw new BadRequestException('Invalid state parameter format');
    }

    const expectedSig = createHmac('sha256', this.hmacSecret).update(encodedPayload).digest('base64url');
    if (signature !== expectedSig) {
      throw new BadRequestException('State token signature verification failed');
    }

    try {
      const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      // Verify token age (max 30 minutes)
      if (Date.now() - decoded.t > 30 * 60 * 1000) {
        throw new BadRequestException('OAuth state token expired. Please try connecting again.');
      }
      return { tenantId: decoded.tenantId, userId: decoded.userId };
    } catch {
      throw new BadRequestException('Malformed state payload');
    }
  }

  @Get('status')
  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get current tenant Gmail connection status (sanitized, zero tokens exposed)' })
  async getStatus(@CurrentTenant() tenantCtx: TenantContext) {
    const connection = await this.withTenant(tenantCtx.tenantId, false, async (tx) => {
      return tx.emailConnection.findUnique({
        where: { tenantId: tenantCtx.tenantId },
      });
    });

    if (!connection) {
      return {
        isConnected: false,
        status: EmailConnectionStatus.DISCONNECTED,
        emailAddress: null,
        lastSyncAt: null,
        provider: 'GMAIL',
      };
    }

    return {
      isConnected: connection.status === EmailConnectionStatus.CONNECTED,
      status: connection.status,
      emailAddress: connection.emailAddress,
      lastSyncAt: connection.lastSyncAt,
      provider: connection.provider,
    };
  }

  @Get('connect')
  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Generate Google OAuth 2.0 authorization URL' })
  async getConnectUrl(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal
  ) {
    if (!this.gmailProvider.clientId || !this.gmailProvider.clientSecret) {
      throw new BadRequestException(
        'Google OAuth is not configured on the server. Please provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment variables.'
      );
    }

    const stateToken = this.generateStateToken(tenantCtx.tenantId, user.id);
    const authUrl = this.gmailProvider.getAuthorizationUrl(stateToken);

    return { authUrl };
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Public Google OAuth callback handler' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response
  ) {
    const webBaseUrl = this.config.WEB_BASE_URL || 'http://localhost:3000';
    const redirectSettingsUrl = `${webBaseUrl}/dashboard/settings/email-to-ticket`;

    if (error) {
      return res.redirect(
        `${redirectSettingsUrl}?error=${encodeURIComponent(`Google authorization error: ${error}`)}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${redirectSettingsUrl}?error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    try {
      const { tenantId, userId } = this.verifyStateToken(state);

      // Exchange code for tokens
      const { tokens, emailAddress } = await this.gmailProvider.exchangeCodeForTokens(code);

      // Encrypt tokens before storing in database
      const encryptedTokenData = this.gmailSyncService.encryptTokens(tokens);

      // Upsert EmailConnection and EmailConfiguration strictly for this tenant under RLS context
      await this.withTenant(tenantId, false, async (tx) => {
        await tx.emailConnection.upsert({
          where: { tenantId },
          update: {
            provider: 'GMAIL',
            emailAddress,
            encryptedTokenData,
            status: EmailConnectionStatus.CONNECTED,
            lastSyncAt: new Date(),
          },
          create: {
            tenantId,
            provider: 'GMAIL',
            emailAddress,
            encryptedTokenData,
            status: EmailConnectionStatus.CONNECTED,
            lastSyncAt: new Date(),
          },
        });

        await tx.emailConfiguration.upsert({
          where: { tenantId },
          update: {
            supportEmail: emailAddress,
            provider: 'GMAIL',
            enabled: true,
            status: 'ACTIVE',
          },
          create: {
            tenantId,
            supportEmail: emailAddress,
            provider: 'GMAIL',
            enabled: true,
            status: 'ACTIVE',
          },
        });
      });

      // Record Audit Event
      await this.auditService.record({
        tenantId,
        actorId: userId,
        eventType: AuditEventType.TENANT_UPDATED,
        resourceType: 'EMAIL_CONNECTION',
        resourceId: tenantId,
        action: 'GMAIL_OAUTH_CONNECTED',
        metadata: {
          emailAddress,
          provider: 'GMAIL',
        },
      });

      return res.redirect(`${redirectSettingsUrl}?connected=true&email=${encodeURIComponent(emailAddress)}`);
    } catch (err: any) {
      return res.redirect(
        `${redirectSettingsUrl}?error=${encodeURIComponent(err?.message || 'Failed connecting Gmail')}`
      );
    }
  }

  @Post('disconnect')
  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Disconnect current tenant Gmail integration' })
  async disconnect(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal
  ) {
    const connection = await this.withTenant(tenantCtx.tenantId, false, async (tx) => {
      return tx.emailConnection.findUnique({
        where: { tenantId: tenantCtx.tenantId },
      });
    });

    if (!connection) {
      throw new NotFoundException('No active email connection found');
    }

    try {
      if (connection.encryptedTokenData) {
        const tokens = this.gmailSyncService.decryptTokens(connection.encryptedTokenData);
        if (tokens.refreshToken || tokens.accessToken) {
          await this.gmailProvider.revokeToken(tokens.refreshToken || tokens.accessToken);
        }
      }
    } catch {
      // Ignore revocation failure if already revoked
    }

    await this.withTenant(tenantCtx.tenantId, false, async (tx) => {
      await tx.emailConnection.update({
        where: { tenantId: tenantCtx.tenantId },
        data: {
          status: EmailConnectionStatus.DISCONNECTED,
          encryptedTokenData: '',
        },
      });
    });

    await this.auditService.record({
      tenantId: tenantCtx.tenantId,
      actorId: user.id,
      eventType: AuditEventType.TENANT_UPDATED,
      resourceType: 'EMAIL_CONNECTION',
      resourceId: connection.id,
      action: 'GMAIL_DISCONNECTED',
      metadata: {
        emailAddress: connection.emailAddress,
      },
    });

    return {
      success: true,
      message: 'Gmail mailbox disconnected successfully',
    };
  }

  @Post('sync')
  @ApiBearerAuth()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Trigger an immediate on-demand Gmail email sync for the current tenant' })
  async triggerSync(@CurrentTenant() tenantCtx: TenantContext) {
    const result = await this.gmailSyncService.syncTenantMailbox(tenantCtx.tenantId);
    return {
      success: true,
      ...result,
    };
  }
}
