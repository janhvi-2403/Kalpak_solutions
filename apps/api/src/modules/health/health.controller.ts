import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../core/auth/public.decorator';
import { PrismaService } from '../../core/database/prisma.service';
import { MailService } from '../../core/mail/mail.service';

@ApiTags('Health & Readiness')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness check probe' })
  @ApiResponse({ status: 200, description: 'Application process is alive' })
  liveness() {
    return {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness check probe validating database connectivity' })
  @ApiResponse({ status: 200, description: 'All backing dependencies are ready' })
  async readiness() {
    let dbStatus = 'DOWN';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'UP';
    } catch {
      dbStatus = 'DOWN';
    }

    const isReady = dbStatus === 'UP';
    return {
      status: isReady ? 'READY' : 'NOT_READY',
      dependencies: {
        database: dbStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('email-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Outbound email service configuration probe' })
  emailStatus() {
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    return {
      status: 'UP',
      provider: process.env.EMAIL_OUTBOUND_PROVIDER || 'resend',
      resendKeyConfigured: resendKey.length > 0,
      resendKeyPrefix: resendKey ? `${resendKey.slice(0, 6)}...` : null,
      fromAddress: this.mailService.getFromAddress(),
      webBaseUrl: this.mailService.getWebBaseUrl(),
      smtpHostConfigured: !!process.env.SMTP_HOST,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('test-send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send diagnostic test verification email' })
  async testSendVerification(@Body() body: { email?: string }) {
    const to = (body?.email || 'support@kalpak.solutions').trim().toLowerCase();
    const result = await this.mailService.sendEmail({
      to,
      subject: 'Kalpak Solutions - Outbound Email Verification Diagnostic',
      text: 'This is a test email sent from Kalpak Solutions to verify outbound mail delivery.',
      html: '<p>This is a test email sent from <strong>Kalpak Solutions</strong> to verify outbound mail delivery.</p>',
    });

    return {
      recipient: to,
      result,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('tenant-admin-status/:slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check tenant admin email verification status' })
  async tenantAdminStatus(@Param('slug') slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.trim().toLowerCase() },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!tenant) {
      return { found: false, slug };
    }

    const admins = [];
    for (const m of tenant.memberships) {
      const u = m.user;
      const activeToken = await this.prisma.emailVerificationToken.findFirst({
        where: { userId: u.id, usedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      admins.push({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        emailVerified: u.emailVerified,
        emailVerifiedAt: u.emailVerifiedAt,
        hasUnusedToken: !!activeToken,
        tokenExpiresAt: activeToken?.expiresAt || null,
      });
    }

    return {
      found: true,
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      admins,
    };
  }

  @Public()
  @Post('verify-user-by-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Directly verify user email for onboarding testing' })
  async verifyUserByEmail(@Body() body: { email: string }) {
    const email = body?.email?.trim().toLowerCase();
    if (!email) {
      return { success: false, message: 'Email is required' };
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      return { success: false, message: `User with email "${email}" not found` };
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: `Account for ${email} has been successfully verified! You can now log in.`,
      email: user.email,
      tenantSlug: user.memberships[0]?.tenant?.slug || null,
    };
  }

  @Public()
  @Post('purge-target')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge a test tenant and associated users by slug or name' })
  async purgeTargetEndpoint(@Body() body: { identifier?: string; email?: string }) {
    const identifier = body?.identifier?.trim().toLowerCase();
    const email = body?.email?.trim().toLowerCase();
    let tenantResult = { purgedTenants: 0, purgedUsers: 0 };
    let emailResult = false;

    if (identifier) {
      tenantResult = await this.prisma.purgeTarget(identifier);
    }
    if (email) {
      emailResult = await this.prisma.purgeUserByEmail(email);
    }

    return {
      success: true,
      identifier,
      email,
      purgedTenants: tenantResult.purgedTenants,
      purgedUsers: tenantResult.purgedUsers,
      userPurgedByEmail: emailResult,
      message: `Successfully purged targets from database.`,
    };
  }

  @Public()
  @Get('list-tenants')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List current tenants for debug' })
  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true, createdAt: true },
    });
    return { count: tenants.length, tenants };
  }

  @Public()
  @Post('purge-all-test-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge all test tenants except the official acme demo tenant' })
  async purgeAllTestData() {
    const testTenants = await this.prisma.tenant.findMany({
      where: {
        slug: { not: 'acme-corp' },
        deletedAt: null,
      },
      select: { slug: true },
    });

    let totalPurged = 0;
    for (const t of testTenants) {
      const res = await this.prisma.purgeTarget(t.slug);
      totalPurged += res.purgedTenants;
    }

    return {
      success: true,
      purgedCount: totalPurged,
      tenants: testTenants.map((t) => t.slug),
      message: 'All previous test entries have been cleanly purged.',
    };
  }
}

