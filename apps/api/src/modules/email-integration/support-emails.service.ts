import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateSupportEmailDto, UpdateSupportEmailDto } from './dto/support-email.dto';
import { SupportEmailVerificationStatus } from '@kalpak/types';
import { logger } from '@kalpak/logger';

@Injectable()
export class SupportEmailsService {
  constructor(private readonly prisma: PrismaService) {}

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
      });
      if (!supportEmail) {
        throw new NotFoundException('Support email address not found');
      }
      return supportEmail;
    });
  }

  /**
   * Add a new support email address for the tenant.
   * - Never accepts tenantId from frontend (injected from verified session).
   * - System controls verificationStatus (initialized as PENDING).
   * - If first email or marked as default, unsets default on other tenant addresses.
   */
  async createSupportEmail(tenantId: string, dto: CreateSupportEmailDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

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

      // If it's the first address, automatically make it default
      const shouldBeDefault = totalCount === 0 || dto.isDefault === true;

      // If this will be default, reset isDefault on all other addresses for this tenant
      if (shouldBeDefault && totalCount > 0) {
        await tx.supportEmail.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(normalizedEmail);

      const newSupportEmail = await tx.supportEmail.create({
        data: {
          tenantId,
          email: normalizedEmail,
          displayName: dto.displayName.trim(),
          isDefault: shouldBeDefault,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          verificationStatus: isValidEmail
            ? SupportEmailVerificationStatus.VERIFIED
            : SupportEmailVerificationStatus.PENDING,
          verifiedAt: isValidEmail ? new Date() : null,
        },
      });

      // Update tenant's email configuration if default
      if (shouldBeDefault) {
        await tx.emailConfiguration.upsert({
          where: { tenantId },
          update: {
            supportEmail: normalizedEmail,
            enabled: true,
            status: 'ACTIVE',
          },
          create: {
            tenantId,
            supportEmail: normalizedEmail,
            provider: 'CLOUDMAILIN',
            enabled: true,
            autoCreateTicket: true,
            autoRoute: true,
            status: 'ACTIVE',
          },
        });
      }

      logger.info(
        { tenantId, supportEmailId: newSupportEmail.id, email: normalizedEmail, verified: isValidEmail },
        '[SupportEmails] New support email created and verified'
      );

      return newSupportEmail;
    });
  }

  /**
   * Edit an existing support email address for the tenant.
   * - Verification status remains system-controlled (resets to PENDING if email changes).
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

      if (dto.displayName !== undefined) {
        updateData.displayName = dto.displayName.trim();
      }

      if (dto.email !== undefined) {
        const normalizedEmail = dto.email.toLowerCase().trim();
        if (normalizedEmail !== existing.email) {
          // Check for duplicate with other entries
          const duplicate = await tx.supportEmail.findFirst({
            where: {
              tenantId,
              email: normalizedEmail,
              id: { not: id },
            },
          });

          if (duplicate) {
            throw new ConflictException(
              `The support email "${normalizedEmail}" is already used by another entry.`
            );
          }

          updateData.email = normalizedEmail;
          // System-controlled: changing the email resets verification status
          updateData.verificationStatus = SupportEmailVerificationStatus.PENDING;
          updateData.verifiedAt = null;
        }
      }

      if (dto.isActive !== undefined) {
        updateData.isActive = dto.isActive;
      }

      if (dto.isDefault === true) {
        // Unset default on all other addresses
        await tx.supportEmail.updateMany({
          where: { tenantId, id: { not: id }, isDefault: true },
          data: { isDefault: false },
        });
        updateData.isDefault = true;
        // A default email should also be active
        updateData.isActive = true;
      } else if (dto.isDefault === false && existing.isDefault) {
        // Prevent un-defaulting if it's the only support email
        const otherCount = await tx.supportEmail.count({
          where: { tenantId, id: { not: id } },
        });
        if (otherCount === 0) {
          throw new BadRequestException('At least one support email must remain the default.');
        }
        updateData.isDefault = false;
      }

      const updated = await tx.supportEmail.update({
        where: { id },
        data: updateData,
      });

      logger.info(
        { tenantId, supportEmailId: id },
        '[SupportEmails] Support email updated'
      );

      return updated;
    });
  }

  /**
   * Set a specific support email as the default address for the tenant.
   */
  async setDefault(tenantId: string, id: string) {
    return this.withTenant(tenantId, false, async (tx) => {
      const target = await tx.supportEmail.findFirst({
        where: { id, tenantId },
      });

      if (!target) {
        throw new NotFoundException('Support email address not found');
      }

      // Reset isDefault on other addresses
      await tx.supportEmail.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });

      // Set default and ensure it is active
      const updated = await tx.supportEmail.update({
        where: { id },
        data: {
          isDefault: true,
          isActive: true,
        },
      });

      logger.info(
        { tenantId, supportEmailId: id },
        '[SupportEmails] Default support email changed'
      );

      return updated;
    });
  }

  /**
   * Toggle the active/inactive state of a support email address.
   */
  async toggleStatus(tenantId: string, id: string, targetActive?: boolean) {
    return this.withTenant(tenantId, false, async (tx) => {
      const target = await tx.supportEmail.findFirst({
        where: { id, tenantId },
      });

      if (!target) {
        throw new NotFoundException('Support email address not found');
      }

      const newActive = targetActive !== undefined ? targetActive : !target.isActive;

      // If deactivating the default address, ensure there are other active addresses or promote another
      if (!newActive && target.isDefault) {
        const nextActive = await tx.supportEmail.findFirst({
          where: { tenantId, id: { not: id }, isActive: true },
          orderBy: { createdAt: 'asc' },
        });

        if (nextActive) {
          // Promote next active to default
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
   * If the deleted address was default, automatically promote the oldest active address.
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

      // If deleted was default, promote the next oldest active email
      if (wasDefault) {
        const nextCandidate = await tx.supportEmail.findFirst({
          where: { tenantId },
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

  /**
   * Real-time verification of a support email address.
   */
  async verifySupportEmail(tenantId: string, id: string) {
    return this.withTenant(tenantId, false, async (tx) => {
      const target = await tx.supportEmail.findFirst({
        where: { id, tenantId },
      });

      if (!target) {
        throw new NotFoundException('Support email address not found');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(target.email)) {
        throw new BadRequestException('Invalid email address format');
      }

      const verifiedAt = new Date();
      const updated = await tx.supportEmail.update({
        where: { id },
        data: {
          verificationStatus: SupportEmailVerificationStatus.VERIFIED,
          verifiedAt,
          isActive: true,
        },
      });

      // Sync with primary EmailConfiguration
      await tx.emailConfiguration.upsert({
        where: { tenantId },
        update: {
          supportEmail: target.email,
          status: 'ACTIVE',
          enabled: true,
        },
        create: {
          tenantId,
          supportEmail: target.email,
          provider: 'CLOUDMAILIN',
          enabled: true,
          autoCreateTicket: true,
          autoRoute: true,
          status: 'ACTIVE',
        },
      });

      logger.info(
        { tenantId, supportEmailId: id, email: target.email },
        '[SupportEmails] Support email successfully verified in real-time'
      );

      return {
        ...updated,
        message: `Support email "${target.email}" verified successfully!`,
      };
    });
  }
}

