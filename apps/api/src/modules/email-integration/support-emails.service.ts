import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { MailService } from '../../core/mail/mail.service';
import {
  CreateSupportEmailDto,
  UpdateSupportEmailDto,
} from './dto/support-email.dto';
import { SupportEmailVerificationStatus } from '@kalpak/types';
import { logger } from '@kalpak/logger';

@Injectable()
export class SupportEmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  /**
   * Generates secure, high-entropy single-use verification credentials.
   * Includes 32-byte URL token and 6-digit numeric code with SHA-256 hashes.
   */
  private generateVerificationCredentials() {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return { rawToken, rawCode, tokenHash, codeHash, expiresAt };
  }

  /**
   * Safe execution wrapper enforcing PostgreSQL Row Level Security (RLS) context
   */
  private async withTenant<T>(
    tenantId: string,
    isSuperAdmin: boolean,
    op: (prisma: PrismaService) => Promise<T>
  ): Promise<T> {
    if (typeof (this.prisma as any).withTenantContext === 'function') {
      return (this.prisma as any).withTenantContext(tenantId, isSuperAdmin, op);
    }
    return op(this.prisma);
  }

  /**
   * List all support email addresses for the tenant.
   * Strict tenant isolation applied.
   */
  async listSupportEmails(tenantId: string) {
    return this.withTenant(tenantId, false, async (tx) => {
      return tx.supportEmail.findMany({
        where: { tenantId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          tenantId: true,
          email: true,
          displayName: true,
          isDefault: true,
          isActive: true,
          verificationStatus: true,
          verifiedAt: true,
          verificationExpiresAt: true,
          lastVerificationSentAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  }

  /**
   * Retrieve a single support email by ID, ensuring it belongs to the tenant.
   */
  async getSupportEmailById(tenantId: string, id: string) {
    return this.withTenant(tenantId, false, async (tx) => {
      const supportEmail = await tx.supportEmail.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          tenantId: true,
          email: true,
          displayName: true,
          isDefault: true,
          isActive: true,
          verificationStatus: true,
          verifiedAt: true,
          verificationExpiresAt: true,
          lastVerificationSentAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!supportEmail) {
        throw new NotFoundException('Support email address not found');
      }
      return supportEmail;
    });
  }

  /**
   * Add a new support email address for the tenant.
   * - System initializes verificationStatus as PENDING.
   * - Generates unique 24-hour verification token & 6-digit code.
   * - Sends real email with link + code to the exact address entered.
   * - Address remains unverified and cannot be activated until confirmed.
   */
  async createSupportEmail(tenantId: string, dto: CreateSupportEmailDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new BadRequestException('Invalid email address format');
    }

    return this.withTenant(tenantId, false, async (tx) => {
      // Check for duplicate email in this organization
      const existing = await tx.supportEmail.findFirst({
        where: {
          tenantId,
          email: normalizedEmail,
        },
      });

      if (existing) {
        throw new ConflictException(
          `The support email address "${normalizedEmail}" is already registered for your organization.`
        );
      }

      // Check how many support emails already exist
      const totalCount = await tx.supportEmail.count({
        where: { tenantId },
      });

      // Default designation is queued until verified
      const wantsDefault = totalCount === 0 || dto.isDefault === true;

      const creds = this.generateVerificationCredentials();

      const newSupportEmail = await tx.supportEmail.create({
        data: {
          tenantId,
          email: normalizedEmail,
          displayName: dto.displayName.trim(),
          isDefault: false, // Default is only awarded once verified
          isActive: false, // Inactive until verified
          verificationStatus: SupportEmailVerificationStatus.PENDING,
          verifiedAt: null,
          verificationTokenHash: creds.tokenHash,
          verificationCodeHash: creds.codeHash,
          verificationExpiresAt: creds.expiresAt,
          lastVerificationSentAt: new Date(),
        },
      });

      // Fetch tenant name & slug for email personalization
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true },
      });

      // Dispatch real verification email
      await this.mailService.sendSupportEmailVerification({
        email: normalizedEmail,
        code: creds.rawCode,
        token: creds.rawToken,
        organizationName: tenant?.name || 'Your Organization',
        tenantSlug: tenant?.slug,
      });

      logger.info(
        { tenantId, supportEmailId: newSupportEmail.id, email: normalizedEmail },
        '[SupportEmails] New support email created in PENDING state; verification email dispatched'
      );

      return {
        ...newSupportEmail,
        verificationTokenHash: undefined,
        verificationCodeHash: undefined,
        wantsDefault,
        message: `Verification email sent to "${normalizedEmail}". Please enter the 6-digit code or click the confirmation link to activate this email address.`,
      };
    });
  }

  /**
   * Resend verification email with a 60-second rate-limiting cooldown.
   */
  async resendVerification(tenantId: string, id: string) {
    return this.withTenant(tenantId, false, async (tx) => {
      const target = await tx.supportEmail.findFirst({
        where: { id, tenantId },
      });

      if (!target) {
        throw new NotFoundException('Support email address not found');
      }

      if (target.verificationStatus === SupportEmailVerificationStatus.VERIFIED) {
        return {
          success: true,
          message: `Support email "${target.email}" is already verified.`,
          supportEmail: target,
        };
      }

      // Enforce 60-second rate limit
      if (target.lastVerificationSentAt) {
        const elapsedMs = Date.now() - new Date(target.lastVerificationSentAt).getTime();
        const cooldownMs = 60 * 1000;
        if (elapsedMs < cooldownMs) {
          const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
          throw new BadRequestException(
            `Please wait ${remainingSec} second${remainingSec > 1 ? 's' : ''} before requesting another verification email.`
          );
        }
      }

      const creds = this.generateVerificationCredentials();

      const updated = await tx.supportEmail.update({
        where: { id },
        data: {
          verificationStatus: SupportEmailVerificationStatus.PENDING,
          verificationTokenHash: creds.tokenHash,
          verificationCodeHash: creds.codeHash,
          verificationExpiresAt: creds.expiresAt,
          lastVerificationSentAt: new Date(),
        },
      });

      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true },
      });

      await this.mailService.sendSupportEmailVerification({
        email: target.email,
        code: creds.rawCode,
        token: creds.rawToken,
        organizationName: tenant?.name || 'Your Organization',
        tenantSlug: tenant?.slug,
      });

      logger.info(
        { tenantId, supportEmailId: id, email: target.email },
        '[SupportEmails] Verification email resent'
      );

      return {
        success: true,
        message: `Verification code and link resent to "${target.email}". Please check your inbox.`,
        supportEmail: {
          ...updated,
          verificationTokenHash: undefined,
          verificationCodeHash: undefined,
        },
      };
    });
  }

  /**
   * Confirm support email via 6-digit code.
   * Invalidates token upon success, marks as VERIFIED, activates the address.
   */
  async confirmVerificationCode(tenantId: string, id: string, code: string) {
    if (!code || !/^\d{6}$/.test(code.trim())) {
      throw new BadRequestException('Please enter a valid 6-digit numeric verification code.');
    }

    const cleanCode = code.trim();
    const hashedCode = crypto.createHash('sha256').update(cleanCode).digest('hex');

    return this.withTenant(tenantId, false, async (tx) => {
      const target = await tx.supportEmail.findFirst({
        where: { id, tenantId },
      });

      if (!target) {
        throw new NotFoundException('Support email address not found');
      }

      if (target.verificationStatus === SupportEmailVerificationStatus.VERIFIED) {
        return target;
      }

      // Check expiry
      if (target.verificationExpiresAt && new Date() > target.verificationExpiresAt) {
        await tx.supportEmail.update({
          where: { id },
          data: { verificationStatus: SupportEmailVerificationStatus.EXPIRED },
        });
        throw new BadRequestException(
          'Verification code has expired. Please click "Resend Code" to receive a fresh verification code.'
        );
      }

      // Check code hash
      if (!target.verificationCodeHash || target.verificationCodeHash !== hashedCode) {
        throw new BadRequestException(
          'Invalid verification code. Please check your email or request a new code.'
        );
      }

      // Promote to default if no other default exists
      const currentDefault = await tx.supportEmail.findFirst({
        where: { tenantId, isDefault: true, id: { not: id } },
      });
      const shouldBeDefault = !currentDefault;

      const verifiedAt = new Date();
      const updated = await tx.supportEmail.update({
        where: { id },
        data: {
          verificationStatus: SupportEmailVerificationStatus.VERIFIED,
          verifiedAt,
          verificationTokenHash: null,
          verificationCodeHash: null,
          verificationExpiresAt: null,
          isActive: true,
          ...(shouldBeDefault ? { isDefault: true } : {}),
        },
      });

      // Synchronize with EmailConfiguration if default
      if (updated.isDefault) {
        await tx.emailConfiguration.upsert({
          where: { tenantId },
          update: {
            supportEmail: updated.email,
            enabled: true,
            status: 'ACTIVE',
            verifiedAt,
            forwardingStatus: 'CONNECTED',
          },
          create: {
            tenantId,
            supportEmail: updated.email,
            provider: 'CLOUDMAILIN',
            enabled: true,
            autoCreateTicket: true,
            autoRoute: true,
            status: 'ACTIVE',
            verifiedAt,
            forwardingStatus: 'CONNECTED',
          },
        });
      }

      logger.info(
        { tenantId, supportEmailId: id, email: updated.email },
        '[SupportEmails] Support email successfully verified via 6-digit code'
      );

      return {
        ...updated,
        verificationTokenHash: undefined,
        verificationCodeHash: undefined,
        message: `Support email "${updated.email}" verified successfully! It is now active for support communications.`,
      };
    });
  }

  /**
   * Public 1-click verification link endpoint from email.
   * Single-use token validation and expiration check.
   */
  async verifyByToken(token: string) {
    if (!token || typeof token !== 'string' || token.trim().length < 16) {
      throw new BadRequestException('Invalid or missing verification token.');
    }

    const cleanToken = token.trim();
    const hashedToken = crypto.createHash('sha256').update(cleanToken).digest('hex');

    const target = await this.prisma.supportEmail.findFirst({
      where: { verificationTokenHash: hashedToken },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });

    if (!target) {
      throw new BadRequestException(
        'Invalid or already-used verification link. If your link has expired, please request a new verification from your dashboard.'
      );
    }

    // Check expiration
    if (target.verificationExpiresAt && new Date() > target.verificationExpiresAt) {
      await this.prisma.supportEmail.update({
        where: { id: target.id },
        data: { verificationStatus: SupportEmailVerificationStatus.EXPIRED },
      });
      throw new BadRequestException(
        'This verification link has expired. Please log in to your dashboard and click "Resend Verification".'
      );
    }

    // Promote to default if no other default exists
    const currentDefault = await this.prisma.supportEmail.findFirst({
      where: { tenantId: target.tenantId, isDefault: true, id: { not: target.id } },
    });
    const shouldBeDefault = !currentDefault;

    const verifiedAt = new Date();
    const updated = await this.prisma.supportEmail.update({
      where: { id: target.id },
      data: {
        verificationStatus: SupportEmailVerificationStatus.VERIFIED,
        verifiedAt,
        verificationTokenHash: null,
        verificationCodeHash: null,
        verificationExpiresAt: null,
        isActive: true,
        ...(shouldBeDefault ? { isDefault: true } : {}),
      },
    });

    if (updated.isDefault) {
      await this.prisma.emailConfiguration.upsert({
        where: { tenantId: target.tenantId },
        update: {
          supportEmail: updated.email,
          enabled: true,
          status: 'ACTIVE',
          verifiedAt,
          forwardingStatus: 'CONNECTED',
        },
        create: {
          tenantId: target.tenantId,
          supportEmail: updated.email,
          provider: 'CLOUDMAILIN',
          enabled: true,
          autoCreateTicket: true,
          autoRoute: true,
          status: 'ACTIVE',
          verifiedAt,
          forwardingStatus: 'CONNECTED',
        },
      });
    }

    logger.info(
      { tenantId: target.tenantId, supportEmailId: target.id, email: target.email },
      '[SupportEmails] Support email successfully verified via email link'
    );

    return {
      success: true,
      message: `Support email "${target.email}" verified successfully!`,
      email: target.email,
      tenantName: target.tenant.name,
      tenantSlug: target.tenant.slug,
    };
  }

  /**
   * Edit an existing support email address for the tenant.
   * Changing the email address resets verification status and sends a new verification email.
   * Only verified addresses can be activated or marked as default.
   */
  async updateSupportEmail(
    tenantId: string,
    id: string,
    dto: UpdateSupportEmailDto
  ) {
    return this.withTenant(tenantId, false, async (tx) => {
      const existing = await tx.supportEmail.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new NotFoundException('Support email address not found');
      }

      const updateData: any = {};
      let emailChanged = false;

      if (dto.displayName !== undefined) {
        updateData.displayName = dto.displayName.trim();
      }

      if (dto.email !== undefined) {
        const normalizedEmail = dto.email.toLowerCase().trim();
        if (normalizedEmail !== existing.email) {
          const duplicate = await tx.supportEmail.findFirst({
            where: {
              tenantId,
              email: normalizedEmail,
              id: { not: id },
            },
          });

          if (duplicate) {
            throw new ConflictException(
              `The support email "${normalizedEmail}" is already registered for your organization.`
            );
          }

          emailChanged = true;
          updateData.email = normalizedEmail;
          // Security requirement: changing address resets verification
          updateData.verificationStatus = SupportEmailVerificationStatus.PENDING;
          updateData.verifiedAt = null;
          updateData.isActive = false;
          updateData.isDefault = false;

          const creds = this.generateVerificationCredentials();
          updateData.verificationTokenHash = creds.tokenHash;
          updateData.verificationCodeHash = creds.codeHash;
          updateData.verificationExpiresAt = creds.expiresAt;
          updateData.lastVerificationSentAt = new Date();

          const tenant = await tx.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, slug: true },
          });

          await this.mailService.sendSupportEmailVerification({
            email: normalizedEmail,
            code: creds.rawCode,
            token: creds.rawToken,
            organizationName: tenant?.name || 'Your Organization',
            tenantSlug: tenant?.slug,
          });
        }
      }

      if (!emailChanged) {
        if (dto.isActive === true && existing.verificationStatus !== SupportEmailVerificationStatus.VERIFIED) {
          throw new BadRequestException(
            'Support email address must be verified before it can be activated.'
          );
        }
        if (dto.isActive !== undefined) {
          updateData.isActive = dto.isActive;
        }

        if (dto.isDefault === true) {
          if (existing.verificationStatus !== SupportEmailVerificationStatus.VERIFIED) {
            throw new BadRequestException(
              'Only verified support email addresses can be set as the default sender.'
            );
          }
          await tx.supportEmail.updateMany({
            where: { tenantId, id: { not: id }, isDefault: true },
            data: { isDefault: false },
          });
          updateData.isDefault = true;
          updateData.isActive = true;
        } else if (dto.isDefault === false && existing.isDefault) {
          const otherVerified = await tx.supportEmail.count({
            where: { tenantId, id: { not: id }, verificationStatus: SupportEmailVerificationStatus.VERIFIED },
          });
          if (otherVerified === 0) {
            throw new BadRequestException('At least one verified support email must remain default.');
          }
          updateData.isDefault = false;
        }
      }

      const updated = await tx.supportEmail.update({
        where: { id },
        data: updateData,
      });

      logger.info({ tenantId, supportEmailId: id, emailChanged }, '[SupportEmails] Support email updated');

      return {
        ...updated,
        verificationTokenHash: undefined,
        verificationCodeHash: undefined,
      };
    });
  }

  /**
   * Designate a support email address as the default for the organization.
   * Only verified addresses are eligible.
   */
  async setDefault(tenantId: string, id: string) {
    return this.withTenant(tenantId, false, async (tx) => {
      const target = await tx.supportEmail.findFirst({
        where: { id, tenantId },
      });

      if (!target) {
        throw new NotFoundException('Support email address not found');
      }

      if (target.verificationStatus !== SupportEmailVerificationStatus.VERIFIED) {
        throw new BadRequestException(
          'Only verified support email addresses can be set as the default sender.'
        );
      }

      await tx.supportEmail.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });

      const updated = await tx.supportEmail.update({
        where: { id },
        data: { isDefault: true, isActive: true },
      });

      await tx.emailConfiguration.upsert({
        where: { tenantId },
        update: {
          supportEmail: updated.email,
          enabled: true,
          status: 'ACTIVE',
        },
        create: {
          tenantId,
          supportEmail: updated.email,
          provider: 'CLOUDMAILIN',
          enabled: true,
          autoCreateTicket: true,
          autoRoute: true,
          status: 'ACTIVE',
        },
      });

      return updated;
    });
  }

  /**
   * Activate or deactivate a support email address.
   * Only verified addresses can be activated.
   */
  async toggleStatus(tenantId: string, id: string, isActive?: boolean) {
    return this.withTenant(tenantId, false, async (tx) => {
      const target = await tx.supportEmail.findFirst({
        where: { id, tenantId },
      });

      if (!target) {
        throw new NotFoundException('Support email address not found');
      }

      const newActive = isActive !== undefined ? isActive : !target.isActive;

      if (newActive && target.verificationStatus !== SupportEmailVerificationStatus.VERIFIED) {
        throw new BadRequestException(
          'Support email address must be verified before it can be activated.'
        );
      }

      if (!newActive && target.isDefault) {
        const nextActive = await tx.supportEmail.findFirst({
          where: {
            tenantId,
            id: { not: id },
            isActive: true,
            verificationStatus: SupportEmailVerificationStatus.VERIFIED,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (nextActive) {
          await tx.supportEmail.update({
            where: { id: nextActive.id },
            data: { isDefault: true },
          });
        }
      }

      const updated = await tx.supportEmail.update({
        where: { id },
        data: {
          isActive: newActive,
          ...(newActive ? {} : { isDefault: false }),
        },
      });

      return updated;
    });
  }

  /**
   * Delete a support email address.
   */
  async deleteSupportEmail(tenantId: string, id: string) {
    return this.withTenant(tenantId, false, async (tx) => {
      const target = await tx.supportEmail.findFirst({
        where: { id, tenantId },
      });

      if (!target) {
        throw new NotFoundException('Support email address not found');
      }

      const wasDefault = target.isDefault;

      await tx.supportEmail.delete({
        where: { id },
      });

      if (wasDefault) {
        const nextCandidate = await tx.supportEmail.findFirst({
          where: { tenantId, verificationStatus: SupportEmailVerificationStatus.VERIFIED },
          orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
        });

        if (nextCandidate) {
          await tx.supportEmail.update({
            where: { id: nextCandidate.id },
            data: { isDefault: true, isActive: true },
          });
        }
      }

      logger.info({ tenantId, supportEmailId: id }, '[SupportEmails] Support email deleted');

      return { success: true, message: 'Support email address deleted successfully' };
    });
  }
}
