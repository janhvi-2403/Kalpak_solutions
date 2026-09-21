import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../../core/mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import {
  verifyPassword,
  hashPassword,
  generateSessionToken,
  hashToken,
  verifyTotp,
} from '@kalpak/auth';
import {
  AuditEventType,
  TenantMembershipInfo,
  UserPrincipal,
  SystemRole,
  TenantStatus,
} from '@kalpak/types';
import { getConfig } from '@kalpak/config';

@Injectable()
export class AuthService {
  private readonly config = getConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService
  ) {}

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    rawToken: string;
    user: UserPrincipal;
    activeTenantId: string | null;
    memberships: TenantMembershipInfo[];
    mfaRequired: boolean;
    tenantSelectionRequired?: boolean;
  }> {
    const email = dto.email.trim().toLowerCase();

    // 1. Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: true,
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt !== null) {
      await this.auditService.record({
        eventType: AuditEventType.AUTH_LOGIN_FAILED,
        resourceType: 'AUTH',
        action: 'LOGIN_ATTEMPT',
        metadata: { email, reason: 'USER_NOT_FOUND' },
        ipAddress,
        userAgent,
      });
      // Generic message mitigates account enumeration attacks
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.auditService.record({
        actorId: user.id,
        eventType: AuditEventType.AUTH_LOGIN_FAILED,
        resourceType: 'AUTH',
        action: 'LOGIN_ATTEMPT',
        metadata: { email, reason: 'ACCOUNT_DEACTIVATED' },
        ipAddress,
        userAgent,
      });
      throw new ForbiddenException('User account is deactivated');
    }

    // 2. Verify password with constant-time comparison
    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.record({
        actorId: user.id,
        eventType: AuditEventType.AUTH_LOGIN_FAILED,
        resourceType: 'AUTH',
        action: 'LOGIN_ATTEMPT',
        metadata: { email, reason: 'INVALID_CREDENTIALS' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Email verification enforcement (unless super admin)
    if (!user.emailVerified && !user.isSuperAdmin) {
      throw new ForbiddenException(
        'Please verify your email address before signing in. Check your inbox for the verification link.'
      );
    }

    // 4. Resolve active tenant context
    const validMemberships = user.memberships.filter(
      (m) => m.tenant.deletedAt === null && m.tenant.status !== TenantStatus.CANCELLED
    );

    let activeMembership = validMemberships.find((m) => m.isDefault);
    let tenantSelectionRequired = false;

    if (dto.tenantSlug) {
      activeMembership = validMemberships.find((m) => m.tenant.slug === dto.tenantSlug);
      if (!activeMembership && !user.isSuperAdmin) {
        throw new ForbiddenException(`You do not have access to organization "${dto.tenantSlug}"`);
      }
    } else if (validMemberships.length === 1) {
      activeMembership = validMemberships[0];
    } else if (validMemberships.length > 1) {
      // User belongs to multiple tenants and none specified in credentials:
      // Pick default for session initial state, but prompt frontend to present organization selector
      const defaultM = validMemberships.find((m) => m.isDefault);
      activeMembership = defaultM || validMemberships[0];
      tenantSelectionRequired = true;
    }

    const activeTenantId = activeMembership?.tenantId || null;

    // 5. Issue session token and store hash in database
    const rawToken = generateSessionToken();
    const sessionTokenHash = hashToken(rawToken);

    const ttlHours = this.config.SESSION_TTL_HOURS;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        activeTenantId,
        sessionTokenHash,
        ipAddress,
        userAgent,
        mfaVerified: !user.mfaEnabled,
        expiresAt,
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 6. Audit log
    await this.auditService.record({
      tenantId: activeTenantId,
      actorId: user.id,
      eventType: user.mfaEnabled
        ? AuditEventType.AUTH_MFA_CHALLENGE
        : AuditEventType.AUTH_LOGIN_SUCCESS,
      resourceType: 'SESSION',
      resourceId: session.id,
      action: user.mfaEnabled ? 'MFA_CHALLENGE_ISSUED' : 'LOGIN_SUCCESS',
      metadata: { ipAddress, activeTenantId },
      ipAddress,
      userAgent,
    });

    const userPrincipal: UserPrincipal = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      mfaEnabled: user.mfaEnabled,
      emailVerified: user.emailVerified,
    };

    const membershipsInfo: TenantMembershipInfo[] = validMemberships.map((m) => ({
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      tenantSlug: m.tenant.slug,
      role: m.role.name as SystemRole,
      permissions: m.role.permissions.map((rp) => rp.permission.code),
    }));

    return {
      rawToken,
      user: userPrincipal,
      activeTenantId,
      memberships: membershipsInfo,
      mfaRequired: user.mfaEnabled,
      tenantSelectionRequired,
    };
  }

  async signup(dto: SignupDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();
    const slug = dto.slug.trim().toLowerCase();

    // 1. Check if email already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email address already exists');
    }

    // 2. Check if slug already in use
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingTenant) {
      throw new ConflictException(`The organization slug "${slug}" is already taken. Please choose another.`);
    }

    // 3. Hash password
    const passwordHash = await hashPassword(dto.password);

    // 4. Retrieve Client Admin role definition
    const clientAdminRole = await this.prisma.role.findFirstOrThrow({
      where: { name: SystemRole.CLIENT_ADMIN, tenantId: null },
    });

    // 5. Create Tenant, User, and Membership in transaction
    const { tenant, user, token } = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: dto.companyName.trim(),
          slug,
          status: TenantStatus.TRIAL,
          settings: {
            businessEmail: dto.businessEmail || email,
            phoneNumber: dto.phoneNumber || null,
            country: dto.country || null,
            timezone: dto.timezone || 'UTC',
            onboarding: {
              completed: false,
              currentStep: 1,
            },
          },
        },
      });

      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName: dto.fullName.trim(),
          phoneNumber: dto.phoneNumber || null,
          isActive: true,
          emailVerified: false,
          isSuperAdmin: false,
        },
      });

      await tx.tenantMembership.create({
        data: {
          tenantId: newTenant.id,
          userId: newUser.id,
          roleId: clientAdminRole.id,
          isDefault: true,
        },
      });

      // Generate verification token (expires in 24 hours)
      const rawVerificationToken = generateSessionToken();
      const tokenHash = hashToken(rawVerificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await tx.emailVerificationToken.create({
        data: {
          userId: newUser.id,
          email,
          tokenHash,
          expiresAt,
        },
      });

      return { tenant: newTenant, user: newUser, token: rawVerificationToken };
    });

    // 6. Send verification email via MailService
    await this.mailService.sendVerificationEmail(email, token, tenant.name);

    // 7. Record audit logs
    await this.auditService.record({
      tenantId: tenant.id,
      actorId: user.id,
      eventType: AuditEventType.TENANT_CREATED,
      resourceType: 'TENANT',
      resourceId: tenant.id,
      action: 'ORGANIZATION_SIGNUP',
      metadata: { slug: tenant.slug, companyName: tenant.name },
      ipAddress,
      userAgent,
    });

    await this.auditService.record({
      tenantId: tenant.id,
      actorId: user.id,
      eventType: AuditEventType.USER_CREATED,
      resourceType: 'USER',
      resourceId: user.id,
      action: 'ADMIN_SIGNUP',
      metadata: { email: user.email },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Organization registered successfully. Please check your email to verify your account.',
      email: user.email,
      tenantSlug: tenant.slug,
    };
  }

  async verifyEmail(dto: VerifyEmailDto, ipAddress?: string, userAgent?: string) {
    const tokenHash = hashToken(dto.token);

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Verification link is invalid or has expired');
    }

    if (tokenRecord.usedAt !== null) {
      return { success: true, message: 'Email has already been verified. You can now sign in.' };
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Verification link has expired. Please request a new verification email.');
    }

    // Mark user verified and token used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.auditService.record({
      actorId: tokenRecord.userId,
      eventType: AuditEventType.AUTH_EMAIL_VERIFIED,
      resourceType: 'USER',
      resourceId: tokenRecord.userId,
      action: 'EMAIL_VERIFIED',
      metadata: { email: tokenRecord.email },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Email verified successfully! You can now sign in to your organization.',
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    // Generic safe response prevents account enumeration
    if (!user || user.emailVerified || user.deletedAt !== null) {
      return {
        success: true,
        message: 'If an unverified account exists with this email, a new verification link has been sent.',
      };
    }

    // Rate-limit check: Ensure at least 60 seconds since last token creation
    const lastToken = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (lastToken && Date.now() - lastToken.createdAt.getTime() < 60 * 1000) {
      return {
        success: true,
        message: 'Please wait at least 60 seconds before requesting another verification email.',
      };
    }

    // Invalidate existing unused tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: user.email,
        tokenHash,
        expiresAt,
      },
    });

    const tenantName = user.memberships[0]?.tenant?.name;
    await this.mailService.sendVerificationEmail(user.email, rawToken, tenantName);

    return {
      success: true,
      message: 'If an unverified account exists with this email, a new verification link has been sent.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Generic safe response mitigates email enumeration
    if (!user || !user.isActive || user.deletedAt !== null) {
      return {
        success: true,
        message: 'If an account exists with that email address, a password reset link has been sent.',
      };
    }

    // Invalidate previous unused reset tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.mailService.sendPasswordResetEmail(user.email, rawToken);

    await this.auditService.record({
      actorId: user.id,
      eventType: AuditEventType.AUTH_PASSWORD_RESET_REQUESTED,
      resourceType: 'AUTH',
      action: 'PASSWORD_RESET_REQUESTED',
      metadata: { email },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'If an account exists with that email address, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress?: string, userAgent?: string) {
    const tokenHash = hashToken(dto.token);

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt !== null || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Password reset link is invalid or has expired. Please request a new one.');
    }

    const newPasswordHash = await hashPassword(dto.password);

    await this.prisma.$transaction([
      // Update password
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      // Mark reset token used
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all active sessions for this user across all devices
      this.prisma.session.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.auditService.record({
      actorId: tokenRecord.userId,
      eventType: AuditEventType.AUTH_PASSWORD_RESET_COMPLETED,
      resourceType: 'AUTH',
      action: 'PASSWORD_RESET_COMPLETED',
      metadata: { userId: tokenRecord.userId },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Your password has been successfully reset. You can now sign in with your new password.',
    };
  }

  async getPublicInvitation(token: string) {
    const tokenHash = hashToken(token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        tenant: true,
        role: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid');
    }

    const isExpired =
      invitation.expiresAt < new Date() ||
      invitation.revokedAt !== null ||
      invitation.acceptedAt !== null;

    return {
      email: invitation.email,
      role: invitation.role.name,
      department: invitation.department,
      tenantName: invitation.tenant.name,
      tenantSlug: invitation.tenant.slug,
      isExpired,
      alreadyAccepted: invitation.acceptedAt !== null,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto, ipAddress?: string, userAgent?: string) {
    const tokenHash = hashToken(dto.token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        tenant: true,
        role: true,
      },
    });

    if (!invitation || invitation.revokedAt !== null) {
      throw new BadRequestException('Invitation is invalid or has been revoked');
    }

    if (invitation.acceptedAt !== null) {
      throw new BadRequestException('This invitation has already been accepted. Please sign in.');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired. Please contact your organization administrator.');
    }

    const email = invitation.email.toLowerCase();
    const passwordHash = await hashPassword(dto.password);

    // Look up or create User
    let user = await this.prisma.user.findUnique({ where: { email } });

    await this.prisma.$transaction(async (tx) => {
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            passwordHash,
            fullName: dto.fullName.trim(),
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: {
            fullName: dto.fullName.trim() || user.fullName,
            emailVerified: true,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
          },
        });
      }

      // Ensure membership is created in the INVITING tenant ONLY
      const existingMembership = await tx.tenantMembership.findUnique({
        where: {
          uq_membership_tenant_user: {
            tenantId: invitation.tenantId,
            userId: user.id,
          },
        },
      });

      if (!existingMembership) {
        await tx.tenantMembership.create({
          data: {
            tenantId: invitation.tenantId,
            userId: user.id,
            roleId: invitation.roleId,
            isDefault: true,
          },
        });
      }

      // Mark invitation accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
    });

    await this.auditService.record({
      tenantId: invitation.tenantId,
      actorId: user?.id,
      eventType: AuditEventType.INVITATION_ACCEPTED,
      resourceType: 'INVITATION',
      resourceId: invitation.id,
      action: 'INVITATION_ACCEPTED',
      metadata: { email, tenantId: invitation.tenantId, role: invitation.role.name },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: `Welcome! You have successfully joined ${invitation.tenant.name}. You can now sign in.`,
      email,
      tenantSlug: invitation.tenant.slug,
    };
  }

  async verifyMfa(
    sessionId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; mfaVerified: boolean }> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.revokedAt !== null || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    if (!session.user.mfaSecret) {
      throw new ForbiddenException('MFA is not configured for this account');
    }

    const isValid = verifyTotp(code, session.user.mfaSecret);
    if (!isValid) {
      await this.auditService.record({
        tenantId: session.activeTenantId,
        actorId: session.userId,
        eventType: AuditEventType.AUTH_LOGIN_FAILED,
        resourceType: 'AUTH',
        action: 'MFA_VERIFICATION_FAILED',
        metadata: { sessionId },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid MFA verification code');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { mfaVerified: true },
    });

    await this.auditService.record({
      tenantId: session.activeTenantId,
      actorId: session.userId,
      eventType: AuditEventType.AUTH_MFA_VERIFIED,
      resourceType: 'SESSION',
      resourceId: session.id,
      action: 'MFA_VERIFIED_SUCCESS',
      metadata: { sessionId },
      ipAddress,
      userAgent,
    });

    return { success: true, mfaVerified: true };
  }

  async logout(sessionId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (session && session.revokedAt === null) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record({
        tenantId: session.activeTenantId,
        actorId: session.userId,
        eventType: AuditEventType.AUTH_LOGOUT,
        resourceType: 'SESSION',
        resourceId: sessionId,
        action: 'LOGOUT',
        ipAddress,
        userAgent,
      });
    }
  }

  async getCurrentSession(userId: string, sessionId: string) {
    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          isSuperAdmin: true,
          emailVerified: true,
          mfaEnabled: true,
          memberships: {
            include: {
              tenant: true,
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.session.findUnique({
        where: { id: sessionId },
      }),
    ]);

    if (!user || !session) {
      throw new NotFoundException('Session not found');
    }

    const validMemberships = user.memberships.filter(
      (m) => m.tenant.deletedAt === null && m.tenant.status !== TenantStatus.CANCELLED
    );

    const activeMembership = validMemberships.find((m) => m.tenantId === session.activeTenantId);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        mfaEnabled: user.mfaEnabled,
        emailVerified: user.emailVerified,
      },
      activeTenantId: session.activeTenantId,
      activeRole: activeMembership?.role?.name || (user.isSuperAdmin ? 'SUPER_ADMIN' : null),
      activeTenant: activeMembership
        ? {
            id: activeMembership.tenant.id,
            name: activeMembership.tenant.name,
            slug: activeMembership.tenant.slug,
            status: activeMembership.tenant.status,
            settings: activeMembership.tenant.settings,
          }
        : null,
      permissions: activeMembership
        ? activeMembership.role.permissions.map((rp) => rp.permission.code)
        : user.isSuperAdmin
          ? ['*']
          : [],
      mfaVerified: session.mfaVerified,
      memberships: validMemberships.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantSlug: m.tenant.slug,
        role: m.role.name,
      })),
    };
  }
}
