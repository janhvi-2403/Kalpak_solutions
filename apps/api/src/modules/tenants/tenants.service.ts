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
import { getConfig } from '@kalpak/config';

@Injectable()
export class TenantsService {
  private readonly config = getConfig();

  private getWebBaseUrl(): string {
    const configured = this.config.WEB_BASE_URL;
    if (process.env.NODE_ENV === 'production' && (!configured || configured.includes('localhost'))) {
      return 'https://kalpak-web.onrender.com';
    }
    return configured || 'https://kalpak-web.onrender.com';
  }

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

  async getTenantBySubdomain(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: subdomain.toLowerCase() },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        settings: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    if (!tenant || tenant.deletedAt !== null || tenant.status === TenantStatus.CANCELLED) {
      throw new NotFoundException(`Tenant organization with subdomain "${subdomain}" not found`);
    }

    const settings = (tenant.settings as any) || {};
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      settings: tenant.settings,
      logoUrl: settings.logoUrl || null,
      primaryColor: settings.primaryColor || null,
    };
  }

  async updateTenantProfile(
    tenantId: string,
    actorId: string,
    dto: {
      name?: string;
      logoUrl?: string;
      address?: string;
      phone?: string;
      website?: string;
      supportEmail?: string;
      primaryColor?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
      timezone?: string;
      dateTimeFormat?: string;
      workingDays?: string[];
      businessHours?: string;
      businessHoursStart?: string;
      businessHoursEnd?: string;
      holidays?: Array<{ name: string; date: string }>;
      serviceCategories?: any[];
      priorities?: any[];
      assignmentRules?: any[];
      notificationPreferences?: Record<string, any>;
      supportRequests?: any[];
      customerChannels?: Record<string, any>;
    }
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt !== null) {
      throw new NotFoundException('Tenant organization not found');
    }

    const currentSettings = (tenant.settings as Record<string, any>) || {};
    const updatedCompanyProfile = {
      ...(currentSettings.companyProfile || {}),
      name: dto.name?.trim() || currentSettings.companyProfile?.name || tenant.name,
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : currentSettings.companyProfile?.logoUrl || currentSettings.logoUrl,
      address: dto.address !== undefined ? dto.address?.trim() : currentSettings.companyProfile?.address,
      phone: dto.phone !== undefined ? dto.phone?.trim() : currentSettings.companyProfile?.phone,
      website: dto.website !== undefined ? dto.website?.trim() : currentSettings.companyProfile?.website,
      supportEmail: dto.supportEmail !== undefined ? dto.supportEmail?.trim() : currentSettings.companyProfile?.supportEmail,
      city: dto.city !== undefined ? dto.city?.trim() : currentSettings.companyProfile?.city,
      state: dto.state !== undefined ? dto.state?.trim() : currentSettings.companyProfile?.state,
      country: dto.country !== undefined ? dto.country?.trim() : currentSettings.companyProfile?.country || 'India',
      pincode: dto.pincode !== undefined ? dto.pincode?.trim() : currentSettings.companyProfile?.pincode,
      timezone: dto.timezone !== undefined ? dto.timezone : currentSettings.companyProfile?.timezone || 'Asia/Kolkata',
      dateTimeFormat: dto.dateTimeFormat !== undefined ? dto.dateTimeFormat : currentSettings.companyProfile?.dateTimeFormat || 'DD/MM/YYYY hh:mm A',
      workingDays: dto.workingDays !== undefined ? dto.workingDays : currentSettings.companyProfile?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      businessHours: dto.businessHours !== undefined ? dto.businessHours : currentSettings.companyProfile?.businessHours || '09:00 AM - 06:00 PM',
      businessHoursStart: dto.businessHoursStart !== undefined ? dto.businessHoursStart : currentSettings.companyProfile?.businessHoursStart || '09:00',
      businessHoursEnd: dto.businessHoursEnd !== undefined ? dto.businessHoursEnd : currentSettings.companyProfile?.businessHoursEnd || '18:00',
      holidays: dto.holidays !== undefined ? dto.holidays : currentSettings.companyProfile?.holidays || [],
    };

    const updatedSettings = {
      ...currentSettings,
      companyProfile: updatedCompanyProfile,
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : currentSettings.logoUrl,
      primaryColor: dto.primaryColor !== undefined ? dto.primaryColor : currentSettings.primaryColor,
      serviceCategories: dto.serviceCategories !== undefined ? dto.serviceCategories : currentSettings.serviceCategories,
      priorities: dto.priorities !== undefined ? dto.priorities : currentSettings.priorities,
      assignmentRules: dto.assignmentRules !== undefined ? dto.assignmentRules : currentSettings.assignmentRules,
      notificationPreferences: dto.notificationPreferences !== undefined ? dto.notificationPreferences : currentSettings.notificationPreferences,
      supportRequests: dto.supportRequests !== undefined ? dto.supportRequests : currentSettings.supportRequests,
      customerChannels: dto.customerChannels !== undefined ? dto.customerChannels : currentSettings.customerChannels,
      basicSetupCompleted: true,
    };

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name?.trim() || tenant.name,
        settings: updatedSettings,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        settings: true,
        updatedAt: true,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.TENANT_UPDATED,
      resourceType: 'TENANT',
      resourceId: tenantId,
      action: 'UPDATE_COMPANY_PROFILE',
      metadata: { name: updatedTenant.name, basicSetupCompleted: true },
    });

    return {
      id: updatedTenant.id,
      name: updatedTenant.name,
      slug: updatedTenant.slug,
      status: updatedTenant.status,
      settings: updatedTenant.settings,
      companyProfile: updatedCompanyProfile,
      updatedAt: updatedTenant.updatedAt,
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

    // 3.5. Enforce Starter Plan Max Employee / Technicians Quota (applicable to staff roles)
    if (roleRecord.name !== 'CLIENT_ADMIN') {
      const policy = await this.prisma.tenantPolicy.findUnique({ where: { tenantId } });
      const maxQuota = policy?.maxUsersQuota ?? 5;
      const currentActiveEmployees = await this.prisma.tenantMembership.count({
        where: {
          tenantId,
          role: { name: { in: ['SUPPORT_EMPLOYEE', 'DEPARTMENT_ADMIN'] } },
          user: { deletedAt: null },
        },
      });
      if (currentActiveEmployees >= maxQuota) {
        throw new BadRequestException(
          `Your organization has reached the ${maxQuota}-technician limit for your current subscription plan. Please upgrade to add more team members.`
        );
      }
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
        fullName: dto.fullName?.trim() || null,
        phone: dto.phone?.trim() || null,
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
      dto.department,
      dto.fullName,
      dto.phone
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
        fullName: invitation.fullName,
        phone: invitation.phone,
        expiresAt: invitation.expiresAt,
        token: rawToken,
        inviteUrl: `${this.getWebBaseUrl()}/accept-invitation?token=${rawToken}`,
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
      fullName: inv.fullName,
      phone: inv.phone,
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

  async resendInvitation(tenantId: string, invitationId: string, actorId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, tenantId },
      include: { role: true, tenant: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt !== null) {
      throw new BadRequestException('This invitation has already been accepted');
    }

    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        tokenHash,
        expiresAt,
        revokedAt: null,
      },
    });

    await this.mailService.sendInvitationEmail(
      invitation.email,
      rawToken,
      invitation.tenant.name,
      invitation.role.name,
      invitation.department || undefined,
      invitation.fullName || undefined,
      invitation.phone || undefined
    );

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.INVITATION_CREATED,
      resourceType: 'INVITATION',
      resourceId: invitationId,
      action: 'RESEND_INVITATION',
      metadata: { email: invitation.email },
    });

    return {
      success: true,
      message: `Invitation resent successfully to ${invitation.email}`,
      expiresAt: updated.expiresAt,
      token: rawToken,
      inviteUrl: `${this.getWebBaseUrl()}/accept-invitation?token=${rawToken}`,
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

  // --------------------------------------------------------------------------
  // Super Admin Platform Overview Metrics (Real Database Queries)
  // --------------------------------------------------------------------------

  async getPlatformOverview(isSuperAdmin: boolean) {
    if (!isSuperAdmin) {
      throw new ForbiddenException('Super Administrator authorization required');
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const now = new Date();
    const inThreeDays = new Date();
    inThreeDays.setDate(now.getDate() + 3);

    const [dbTenants, dbSubscriptions, dbFailedPayments, dbAuditEvents] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { deletedAt: null },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentTransaction.findMany({
        where: {
          status: 'FAILED',
        },
      }),
      this.prisma.auditEvent.findMany({
        where: {
          tenantId: { not: null },
          tenant: { deletedAt: null },
          // Exclude internal authentication/login events - only show customer business actions
          eventType: {
            notIn: [
              'AUTH_LOGIN_SUCCESS',
              'AUTH_MFA_ENABLED',
              'BOOTSTRAP_STARTED',
              'BOOTSTRAP_COMPLETED',
              'USER_LOGGED_IN',
              'USER_LOGGED_OUT',
              'SESSION_REFRESHED',
              'USER_LOGGED_IN_PASSWORD',
            ],
          },
        },
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
      }),
    ]);

    // 1. Real Client Tenant Overview Counts
    const totalTenants = dbTenants.length;
    const activeTenants = dbTenants.filter((t) => t.status === TenantStatus.ACTIVE).length;
    const trialTenants = dbTenants.filter((t) => t.status === TenantStatus.TRIAL).length;
    const suspendedTenants = dbTenants.filter(
      (t) => t.status === TenantStatus.SUSPENDED || t.status === TenantStatus.CANCELLED
    ).length;

    // 2. Real Plan Breakdown
    let starterCount = 0;
    let professionalCount = 0;
    let enterpriseCount = 0;

    for (const tenant of dbTenants) {
      const activeSub = tenant.subscriptions?.[0];
      const settings = (tenant.settings as Record<string, any>) || {};
      const plan = activeSub?.plan || settings.selectedPlan || 'STARTER';

      if (plan === 'ENTERPRISE') {
        enterpriseCount++;
      } else if (plan === 'PROFESSIONAL') {
        professionalCount++;
      } else {
        starterCount++;
      }
    }

    // 3. Real Revenue & Velocity Metrics
    let mrr = 0;
    for (const sub of dbSubscriptions) {
      if (sub.status === 'ACTIVE' || sub.status === 'TRIAL') {
        const amt = Number(sub.amount) || 0;
        if (sub.billingCycle === 'ANNUAL') {
          mrr += Math.round(amt / 12);
        } else {
          mrr += amt;
        }
      }
    }

    const arr = mrr * 12;

    const newSubscriptionsThisMonth = dbSubscriptions.filter(
      (s) => new Date(s.createdAt) >= startOfMonth
    ).length || dbTenants.filter((t) => new Date(t.createdAt) >= startOfMonth).length;

    const renewalsThisMonth = dbSubscriptions.filter(
      (s) => s.status === 'ACTIVE' && new Date(s.updatedAt) >= startOfMonth && new Date(s.createdAt) < startOfMonth
    ).length;

    const cancellationsThisMonth = dbSubscriptions.filter(
      (s) => s.status === 'CANCELLED' && new Date(s.updatedAt) >= startOfMonth
    ).length + dbTenants.filter((t) => t.status === TenantStatus.CANCELLED && new Date(t.updatedAt) >= startOfMonth).length;

    const churnRate = activeTenants > 0
      ? `${((cancellationsThisMonth / activeTenants) * 100).toFixed(1)}%`
      : '0.0%';

    const trialsExpiringSoon = dbSubscriptions.filter(
      (s) => s.status === 'TRIAL' && new Date(s.endsAt) <= inThreeDays && new Date(s.endsAt) >= now
    ).length + dbTenants.filter((t) => t.status === TenantStatus.TRIAL).length;

    const paymentsRequiringAttention = dbFailedPayments.length;

    // 4. Real Recent Customer & Client Admin Activity Stream (No login spam)
    const recentActivity: Array<{
      id: string;
      tenantName: string;
      tenantSlug: string;
      action: string;
      badge: string;
      variant: 'emerald' | 'blue' | 'red' | 'orange' | 'purple';
      timestamp: string;
    }> = [];

    const formatTimeAgo = (date: Date) => {
      const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
      return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    if (dbAuditEvents && dbAuditEvents.length > 0) {
      for (const evt of dbAuditEvents) {
        if (!evt.tenant) continue;
        const tName = evt.tenant.name;
        const tSlug = evt.tenant.slug;

        let action = evt.action.replace(/_/g, ' ').toLowerCase();
        action = action.charAt(0).toUpperCase() + action.slice(1);
        let badge = 'Client Action';
        let variant: 'emerald' | 'blue' | 'red' | 'orange' | 'purple' = 'emerald';

        if (evt.eventType.includes('TENANT_CREATED') || evt.action.includes('REGISTER')) {
          badge = 'New Registration';
          variant = 'emerald';
          action = 'Client registered organization';
        } else if (evt.eventType.includes('SUBSCRIPTION_RENEW') || evt.action.includes('RENEW')) {
          badge = 'Renewed';
          variant = 'emerald';
          action = 'Subscription renewed';
        } else if (evt.eventType.includes('SUBSCRIPTION') || evt.action.includes('TRIAL')) {
          badge = 'Trial Started';
          variant = 'blue';
          action = 'Trial started';
        } else if (evt.eventType.includes('FAIL') || evt.action.includes('FAIL')) {
          badge = 'Payment Failed';
          variant = 'red';
          action = 'Subscription payment failed';
        } else if (evt.eventType.includes('UPDATE_COMPANY') || evt.action.includes('PROFILE')) {
          badge = 'Profile Setup';
          variant = 'orange';
          action = 'Company profile configured';
        } else if (evt.eventType.includes('INVITATION')) {
          badge = 'Team Member';
          variant = 'blue';
          action = 'Staff invitation sent';
        } else {
          continue; // Skip any non-customer actions
        }

        recentActivity.push({
          id: evt.id,
          tenantName: tName,
          tenantSlug: tSlug,
          action,
          badge,
          variant,
          timestamp: formatTimeAgo(evt.createdAt),
        });
      }
    }

    // Populate with real registered client tenants (customer companies)
    for (const t of dbTenants) {
      if (!recentActivity.some((a) => a.tenantSlug === t.slug)) {
        const sub = t.subscriptions?.[0];
        const planName = sub?.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1).toLowerCase() : 'Starter';
        const isTrial = t.status === TenantStatus.TRIAL;

        recentActivity.push({
          id: `tenant-${t.id}`,
          tenantName: t.name,
          tenantSlug: t.slug,
          action: isTrial ? `${planName} trial started` : 'Account activated & operational',
          badge: isTrial ? 'Trial Started' : 'Account Activated',
          variant: isTrial ? 'blue' : 'emerald',
          timestamp: formatTimeAgo(t.createdAt),
        });
      }
    }

    return {
      overview: {
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
      },
      planBreakdown: {
        starter: starterCount,
        professional: professionalCount,
        enterprise: enterpriseCount,
      },
      revenueMetrics: {
        mrr,
        arr,
        newSubscriptionsThisMonth,
        renewalsThisMonth,
        cancellationsThisMonth,
        churnRate,
        trialsExpiringSoon,
        paymentsRequiringAttention,
      },
      recentActivity: recentActivity.slice(0, 10),
      tenants: dbTenants.slice(0, 15).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        createdAt: t.createdAt,
      })),
    };
  }
}


