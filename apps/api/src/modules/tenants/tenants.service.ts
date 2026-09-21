import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../../core/mail/mail.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { AuditEventType, TenantStatus } from '@kalpak/types';
import { generateSessionToken, hashToken } from '@kalpak/auth';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService
  ) {}

  async getTenantDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!tenant || tenant.deletedAt !== null) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      settings: tenant.settings,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async switchTenant(
    userId: string,
    targetTenantId: string,
    sessionId: string,
    isSuperAdmin: boolean,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Verify tenant exists and is active
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: targetTenantId },
    });

    if (!tenant || tenant.deletedAt !== null) {
      throw new NotFoundException('Target tenant organization not found');
    }

    if (tenant.status === TenantStatus.CANCELLED || tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException(`Cannot switch to tenant: Organization is ${tenant.status}`);
    }

    // 2. Verify user has membership in target tenant (or is super admin)
    let membershipRole: string | null = null;
    if (!isSuperAdmin) {
      const membership = await this.prisma.tenantMembership.findUnique({
        where: {
          uq_membership_tenant_user: {
            tenantId: targetTenantId,
            userId,
          },
        },
        include: { role: true },
      });

      if (!membership) {
        throw new ForbiddenException('You are not a member of the target tenant organization');
      }
      membershipRole = membership.role.name;
    } else {
      membershipRole = 'SUPER_ADMIN';
    }

    // 3. Update session activeTenantId
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { activeTenantId: targetTenantId },
    });

    // 4. Audit event
    await this.auditService.record({
      tenantId: targetTenantId,
      actorId: userId,
      eventType: AuditEventType.TENANT_UPDATED,
      resourceType: 'SESSION',
      resourceId: sessionId,
      action: 'SWITCH_ACTIVE_TENANT',
      metadata: { targetTenantId, role: membershipRole },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      activeTenantId: targetTenantId,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      role: membershipRole,
    };
  }

  // --------------------------------------------------------------------------
  // Client Admin Onboarding
  // --------------------------------------------------------------------------

  async getOnboardingState(tenantId: string | null | undefined) {
    if (!tenantId) {
      return {
        tenantName: 'Platform Superadmin',
        tenantSlug: 'superadmin',
        onboarding: {
          completed: true,
          currentStep: 9,
        },
      };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true, name: true, slug: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const settings = (tenant.settings as Record<string, any>) || {};
    const onboarding = settings.onboarding || {
      completed: false,
      currentStep: 1,
    };

    return {
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      onboarding,
    };
  }

  async updateOnboardingState(tenantId: string | null | undefined, actorId: string, dto: UpdateOnboardingDto) {
    if (!tenantId) {
      throw new BadRequestException('A valid active organization must be selected for onboarding operations');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const currentSettings = (tenant.settings as Record<string, any>) || {};
    const currentOnboarding = currentSettings.onboarding || {};

    const updatedOnboarding = {
      ...currentOnboarding,
      ...dto,
      currentStep: dto.currentStep !== undefined ? dto.currentStep : currentOnboarding.currentStep || 1,
      completed: dto.completed !== undefined ? dto.completed : currentOnboarding.completed || false,
    };

    const newSettings = {
      ...currentSettings,
      onboarding: updatedOnboarding,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: newSettings },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.ONBOARDING_UPDATED,
      resourceType: 'TENANT',
      resourceId: tenantId,
      action: 'UPDATE_ONBOARDING',
      metadata: { step: updatedOnboarding.currentStep, completed: updatedOnboarding.completed },
    });

    return {
      success: true,
      onboarding: updatedOnboarding,
    };
  }

  async completeOnboarding(tenantId: string | null | undefined, actorId: string) {
    if (!tenantId) {
      throw new BadRequestException('A valid active organization must be selected for onboarding operations');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const currentSettings = (tenant.settings as Record<string, any>) || {};
    const updatedOnboarding = {
      ...(currentSettings.onboarding || {}),
      completed: true,
      currentStep: 9,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...currentSettings,
          onboarding: updatedOnboarding,
        },
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.ONBOARDING_COMPLETED,
      resourceType: 'TENANT',
      resourceId: tenantId,
      action: 'COMPLETE_ONBOARDING',
    });

    return {
      success: true,
      message: 'Onboarding completed successfully!',
      onboarding: updatedOnboarding,
    };
  }

  // --------------------------------------------------------------------------
  // Employee Invitations
  // --------------------------------------------------------------------------

  async createInvitation(tenantId: string, actorId: string, dto: CreateInvitationDto) {
    const email = dto.email.trim().toLowerCase();

    // 1. Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant organization not found');
    }

    // 2. Check if user already a member of THIS tenant
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await this.prisma.tenantMembership.findUnique({
        where: {
          uq_membership_tenant_user: {
            tenantId,
            userId: existingUser.id,
          },
        },
      });
      if (existingMembership) {
        throw new ConflictException('This user is already an active member of this organization');
      }
    }

    // 3. Resolve Role
    const roleRecord = await this.prisma.role.findFirst({
      where: {
        name: dto.role,
        OR: [{ tenantId }, { tenantId: null }],
      },
    });

    if (!roleRecord) {
      throw new BadRequestException(`Role "${dto.role}" is invalid or not found`);
    }

    // 4. Invalidate existing pending invitations for this email in this tenant
    await this.prisma.invitation.updateMany({
      where: {
        tenantId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    // 5. Generate secure token
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        tenantId,
        email,
        roleId: roleRecord.id,
        department: dto.department?.trim() || null,
        tokenHash,
        invitedByUserId: actorId,
        expiresAt,
      },
      include: {
        role: true,
      },
    });

    // 6. Send Invitation Email
    await this.mailService.sendInvitationEmail(
      email,
      rawToken,
      tenant.name,
      roleRecord.name,
      dto.department
    );

    // 7. Audit log
    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.INVITATION_CREATED,
      resourceType: 'INVITATION',
      resourceId: invitation.id,
      action: 'INVITE_EMPLOYEE',
      metadata: { email, role: roleRecord.name, department: dto.department },
    });

    return {
      success: true,
      message: `Invitation sent successfully to ${email}`,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: roleRecord.name,
        department: invitation.department,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  async listInvitations(tenantId: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: {
        tenantId,
        acceptedAt: null,
        revokedAt: null,
      },
      include: {
        role: true,
        invitedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role.name,
      department: inv.department,
      invitedBy: inv.invitedBy?.fullName || 'Administrator',
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));
  }

  async revokeInvitation(tenantId: string, invitationId: string, actorId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt !== null) {
      throw new BadRequestException('Cannot revoke an invitation that has already been accepted');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.INVITATION_REVOKED,
      resourceType: 'INVITATION',
      resourceId: invitationId,
      action: 'REVOKE_INVITATION',
      metadata: { email: invitation.email },
    });

    return {
      success: true,
      message: 'Invitation revoked successfully',
    };
  }

  // --------------------------------------------------------------------------
  // Tenant Configuration Matrix & Policy
  // --------------------------------------------------------------------------

  async getTenantPolicy(tenantId: string) {
    let policy = await this.prisma.tenantPolicy.findUnique({
      where: { tenantId },
    });

    if (!policy) {
      // Auto-provision default policy
      policy = await this.prisma.tenantPolicy.create({
        data: {
          tenantId,
          businessType: 'BOTH',
          purposeOfUse: 'BOTH',
          allowCustomerToRaise: true,
          allowEmployeeOnBehalf: true,
          assignmentStrategy: 'MANUAL_DEPT_HEAD',
          closureAuthority: 'SUPPORT_EMPLOYEE',
          tolerableOpenDays: 3,
          notificationChannels: 'EMAIL',
          platformAccess: 'BOTH',
          pushNotifications: true,
          maxUsersQuota: 25,
        },
      });
    }

    return policy;
  }

  async updateTenantPolicy(tenantId: string, actorId: string, dto: any) {
    // Ensure policy exists
    await this.getTenantPolicy(tenantId);

    const updated = await this.prisma.tenantPolicy.update({
      where: { tenantId },
      data: {
        ...dto,
        subscriptionEndsAt: dto.subscriptionEndsAt !== undefined
          ? (dto.subscriptionEndsAt ? new Date(dto.subscriptionEndsAt) : null)
          : undefined,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.POLICY_UPDATED,
      resourceType: 'TENANT_POLICY',
      resourceId: updated.id,
      action: 'UPDATE_POLICY',
      metadata: { ...dto },
    });

    return updated;
  }
}
