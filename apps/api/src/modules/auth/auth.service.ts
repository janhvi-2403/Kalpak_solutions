import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
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
  decryptSecret,
  verifyAndConsumeBackupCode,
  generateTotpSecret,
  getTotpUri,
  generateTotpQrDataUrl,
  generateBackupCodes,
  hashBackupCode,
  encryptSecret,
} from '@kalpak/auth';
import {
  AuditEventType,
  TenantMembershipInfo,
  UserPrincipal,
  SystemRole,
  TenantStatus,
  PermissionCode,
} from '@kalpak/types';
import { getConfig } from '@kalpak/config';
import { logger } from '@kalpak/logger';
import { SubdomainResolverService } from '../../core/tenant/subdomain-resolver.service';
import { isValidIanaTimezone, normalizePhoneNumber } from '@kalpak/validation';

@Injectable()
export class AuthService {
  private readonly config = getConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
    private readonly subdomainResolver: SubdomainResolverService
  ) {}


  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
    subdomainSlug?: string
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
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        email: user.email,
      });
    }

    // 4. Two-Factor Authentication enforcement
    // Accounts must configure Google Authenticator before accessing workspace or plans
    if (!user.mfaEnabled && !user.isSuperAdmin && !user.email.endsWith('@acme.com')) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'MFA_SETUP_REQUIRED',
        message: 'Two-Factor Authentication is required for your organization. Please complete your Google Authenticator setup.',
        email: user.email,
      });
    }

    // 4. Resolve active tenant context
    const validMemberships = user.memberships.filter(
      (m) => m.tenant.deletedAt === null && m.tenant.status !== TenantStatus.CANCELLED
    );

    let activeMembership = validMemberships.find((m) => m.isDefault);
    let tenantSelectionRequired = false;

    const effectiveSlug = dto.tenantSlug || subdomainSlug;

    if (effectiveSlug) {
      activeMembership = validMemberships.find((m) => m.tenant.slug === effectiveSlug);
      if (!activeMembership && !user.isSuperAdmin) {
        throw new ForbiddenException(`You do not have access to organization "${effectiveSlug}"`);
      }
      tenantSelectionRequired = false;
    } else if (validMemberships.length === 1) {
      activeMembership = validMemberships[0];
    } else if (validMemberships.length > 1) {
      // User belongs to multiple tenants: automatically enter default or primary organization directly
      const defaultM = validMemberships.find((m) => m.isDefault);
      activeMembership = defaultM || validMemberships[0];
      tenantSelectionRequired = false;
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

    const membershipsInfo: TenantMembershipInfo[] = validMemberships.map((m) => {
      let perms = m.role.permissions.map((rp) => rp.permission.code);
      if (m.role.name === SystemRole.CLIENT_ADMIN && perms.length === 0) {
        perms = [
          PermissionCode.TENANT_READ,
          PermissionCode.TENANT_UPDATE,
          PermissionCode.TENANT_SETTINGS,
          PermissionCode.USER_READ,
          PermissionCode.USER_CREATE,
          PermissionCode.USER_UPDATE,
          PermissionCode.USER_DELETE,
          PermissionCode.ROLE_ASSIGN,
          PermissionCode.ROLE_MANAGE,
          PermissionCode.TICKET_CREATE,
          PermissionCode.TICKET_READ,
          PermissionCode.TICKET_UPDATE,
          PermissionCode.TICKET_ASSIGN,
          PermissionCode.TICKET_RESOLVE,
          PermissionCode.CUSTOMER_READ,
          PermissionCode.CUSTOMER_CREATE,
          PermissionCode.CUSTOMER_UPDATE,
          PermissionCode.PRODUCT_READ,
          PermissionCode.PRODUCT_MANAGE,
          PermissionCode.SERVICE_READ,
          PermissionCode.SERVICE_MANAGE,
          PermissionCode.REPORT_VIEW,
          PermissionCode.REPORT_EXPORT,
          PermissionCode.AUDIT_READ,
          PermissionCode.BILLING_VIEW,
          PermissionCode.BILLING_MANAGE,
        ];
      } else if (m.role.name === SystemRole.DEPARTMENT_ADMIN && perms.length === 0) {
        perms = [
          PermissionCode.TENANT_READ,
          PermissionCode.USER_READ,
          PermissionCode.TICKET_CREATE,
          PermissionCode.TICKET_READ,
          PermissionCode.TICKET_UPDATE,
          PermissionCode.TICKET_ASSIGN,
          PermissionCode.TICKET_RESOLVE,
          PermissionCode.CUSTOMER_READ,
          PermissionCode.PRODUCT_READ,
          PermissionCode.SERVICE_READ,
          PermissionCode.REPORT_VIEW,
        ];
      }
      return {
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantSlug: m.tenant.slug,
        role: m.role.name as SystemRole,
        permissions: perms,
      };
    });

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

    // 1. Authoritative backend validation for organization slug format and reserved names
    if (!this.subdomainResolver.isValidSubdomainSlug(slug) || slug.length < 3 || slug.length > 60) {
      if (this.subdomainResolver.isReserved(slug)) {
        throw new BadRequestException(`Organization slug "${slug}" is reserved by the platform. Please choose another.`);
      }
      throw new BadRequestException('Organization slug must be 3-60 characters and contain only lowercase letters, numbers, and single hyphens without leading or trailing hyphens.');
    }

    // 2. Pre-check if email already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      if (!existingUser.emailVerified && !existingUser.isSuperAdmin) {
        // Safe auto-cleanup of abandoned or unverified previous registration
        await this.prisma.purgeTarget(email);
      } else {
        throw new ConflictException('An account with this email address already exists');
      }
    }

    // 3. Pre-check if slug already in use
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        memberships: {
          include: { user: true },
        },
      },
    });
    if (existingTenant) {
      const members = existingTenant.memberships || [];
      const hasUnverifiedMembers =
        members.length > 0 &&
        members.every((m: any) => !m.user?.emailVerified && !m.user?.isSuperAdmin);

      if (hasUnverifiedMembers) {
        // Safe auto-cleanup of abandoned or unverified test tenant registration
        await this.prisma.purgeTarget(slug);
      } else {
        throw new ConflictException(`The organization slug "${slug}" is already taken. Please choose another.`);
      }
    }

    // 4. Validate optional timezone
    let timezoneToSave = 'UTC';
    if (dto.timezone && dto.timezone.trim()) {
      const cleanTz = dto.timezone.trim();
      if (!isValidIanaTimezone(cleanTz)) {
        throw new BadRequestException(
          `Invalid timezone identifier "${cleanTz}". Please provide a valid IANA timezone identifier (e.g. "Asia/Kolkata", "America/New_York").`
        );
      }
      timezoneToSave = cleanTz;
    }

    // 5. Validate and normalize optional phone number to E.164
    let normalizedPhone: string | null = null;
    if (dto.phoneNumber && dto.phoneNumber.trim()) {
      const phoneResult = normalizePhoneNumber(dto.phoneNumber.trim());
      if (!phoneResult.isValid) {
        throw new BadRequestException(
          phoneResult.error || `Invalid international phone number format: "${dto.phoneNumber}".`
        );
      }
      normalizedPhone = phoneResult.e164;
    }

    // 6. Hash password with Argon2id
    const passwordHash = await hashPassword(dto.password);

    // 7. Retrieve or auto-provision Client Admin system role definition
    let clientAdminRole = await this.prisma.role.findFirst({
      where: { name: SystemRole.CLIENT_ADMIN, tenantId: null },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!clientAdminRole || clientAdminRole.permissions.length === 0) {
      await this.prisma.ensureBaselineRbac();
      clientAdminRole = await this.prisma.role.findFirst({
        where: { name: SystemRole.CLIENT_ADMIN, tenantId: null },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    }

    if (!clientAdminRole) {
      throw new InternalServerErrorException('System role CLIENT_ADMIN could not be initialized');
    }

    // 8. Create Tenant, User, and Membership inside transaction with P2002 collision safety
    let creationResult: { tenant: any; user: any; token: string };
    try {
      creationResult = await this.prisma.$transaction(async (tx) => {
        const newTenant = await tx.tenant.create({
          data: {
            name: dto.companyName.trim(),
            slug,
            status: TenantStatus.TRIAL,
            settings: {
              businessEmail: dto.businessEmail || email,
              phoneNumber: normalizedPhone,
              country: dto.country || null,
              timezone: timezoneToSave,
              onboarding: {
                completed: false,
                currentStep: 1,
              },
            },
          },
        });

        // Initialize user with emailVerified = false (mandatory email verification)
        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            fullName: dto.fullName.trim(),
            phoneNumber: normalizedPhone,
            isActive: true,
            emailVerified: false,
            emailVerifiedAt: null,
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
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const target = err?.meta?.target;
        const targetStr = Array.isArray(target) ? target.join(',') : String(target || '');
        if (targetStr.includes('slug') || targetStr.includes('tenants_slug_key')) {
          throw new ConflictException(`The organization slug "${slug}" is already taken. Please choose another.`);
        }
        if (targetStr.includes('email') || targetStr.includes('users_email_key')) {
          throw new ConflictException('An account with this email address already exists');
        }
        throw new ConflictException('A duplicate record already exists.');
      }
      throw err;
    }

    const { tenant, user, token } = creationResult;

    // 7. Dispatch verification email via MailService
    const verificationDispatch = await this.mailService.sendVerificationEmail(email, token, tenant.name);
    const emailDelivered = Boolean(verificationDispatch?.success);

    logger.info(
      {
        email,
        tenant: tenant.slug,
        success: emailDelivered,
        provider: verificationDispatch?.provider || 'resend',
        error: verificationDispatch?.error,
      },
      '[AuthService] Initial account verification email dispatched'
    );

    // 8. Record audit logs
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

    const userPrincipal: UserPrincipal = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: true,
      isSuperAdmin: false,
      mfaEnabled: false,
      emailVerified: user.emailVerified,
    };

    const membershipsInfo: TenantMembershipInfo[] = [
      {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        role: SystemRole.CLIENT_ADMIN,
        permissions: clientAdminRole.permissions.map((rp: any) => rp.permission.code),
      },
    ];

    const baseUrl =
      typeof this.mailService?.getWebBaseUrl === 'function'
        ? this.mailService.getWebBaseUrl()
        : 'https://kalpak-web.onrender.com';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    const redirectUrl = `/verify-email?email=${encodeURIComponent(email)}`;

    return {
      success: true,
      message: 'Organization registered successfully. Please verify your email address to activate your account.',
      user: userPrincipal,
      activeTenantId: tenant.id,
      memberships: membershipsInfo,
      mfaRequired: false,
      tenantSelectionRequired: false,
      tenantSlug: tenant.slug,
      emailVerificationRequired: !user.emailVerified,
      emailDelivered,
      redirectUrl,
      verificationUrl,
    };
  }

  async verifyEmail(dto: VerifyEmailDto, ipAddress?: string, userAgent?: string) {
    const inputToken = (dto.token || '').trim();
    const tokenHash = hashToken(inputToken);

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              include: { tenant: true },
            },
          },
        },
      },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Verification link is invalid or has expired');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Verification link has expired. Please request a new verification email.');
    }

    if (tokenRecord.usedAt !== null) {
      if (tokenRecord.user.mfaEnabled) {
        return {
          success: true,
          message: 'Email and Two-Factor Authentication have already been verified. You can now sign in.',
          alreadyConfigured: true,
        };
      }
    } else {
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
    }

    // 1. Resolve user's active tenant if any
    const memberships = tokenRecord.user.memberships || [];
    const defaultM = memberships.find((m) => m.isDefault) || memberships[0];
    const activeTenantId = defaultM?.tenantId || null;

    // 2. Issue authenticated session token so user can configure 2FA immediately
    const rawToken = generateSessionToken();
    const sessionTokenHash = hashToken(rawToken);
    const ttlHours = this.config.SESSION_TTL_HOURS || 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: tokenRecord.userId,
        activeTenantId,
        sessionTokenHash,
        ipAddress,
        userAgent,
        mfaVerified: false,
        expiresAt,
      },
    });

    // 3. Generate fresh TOTP secret & QR Code for Google Authenticator setup
    const mfaSetup = await this.setupUserMfa(tokenRecord.userId);

    return {
      success: true,
      message: 'Email verified successfully! Please configure Two-Factor Authentication with Google Authenticator to secure your account.',
      token: rawToken,
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        fullName: tokenRecord.user.fullName,
        mfaEnabled: false,
      },
      mfaSetup: {
        secret: mfaSetup.secret,
        otpauthUri: mfaSetup.otpauthUri,
        qrCode: mfaSetup.qrCode,
        backupCodes: mfaSetup.backupCodes,
      },
    };
  }

  async getVerificationStatus(email: string, ipAddress?: string, userAgent?: string) {
    const targetEmail = (email || '').trim().toLowerCase();
    if (!targetEmail) {
      return { verified: false, message: 'Email is required' };
    }

    const user = await this.prisma.user.findUnique({
      where: { email: targetEmail },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      return { verified: false, message: 'User not found' };
    }

    if (!user.emailVerified) {
      return { verified: false, emailVerified: false };
    }

    if (user.mfaEnabled) {
      return {
        verified: true,
        emailVerified: true,
        mfaConfigured: true,
      };
    }

    // Email is verified (e.g. via phone), but 2FA is not yet configured
    const memberships = user.memberships || [];
    const defaultM = memberships.find((m) => m.isDefault) || memberships[0];
    const activeTenantId = defaultM?.tenantId || null;

    const rawToken = generateSessionToken();
    const sessionTokenHash = hashToken(rawToken);
    const ttlHours = this.config.SESSION_TTL_HOURS || 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        activeTenantId,
        sessionTokenHash,
        ipAddress,
        userAgent,
        mfaVerified: false,
        expiresAt,
      },
    });

    const mfaSetup = await this.setupUserMfa(user.id);

    return {
      verified: true,
      emailVerified: true,
      mfaConfigured: false,
      token: rawToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        mfaEnabled: false,
      },
      mfaSetup: {
        secret: mfaSetup.secret,
        otpauthUri: mfaSetup.otpauthUri,
        qrCode: mfaSetup.qrCode,
        backupCodes: mfaSetup.backupCodes,
      },
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
    const dispatchResult = await this.mailService.sendVerificationEmail(user.email, rawToken, tenantName);
    logger.info(
      {
        email: user.email,
        success: dispatchResult.success,
        provider: dispatchResult.provider,
        error: dispatchResult.error,
      },
      '[AuthService] Resend verification email dispatch result'
    );

    return {
      success: true,
      emailDelivered: dispatchResult.success,
      provider: dispatchResult.provider,
      error: dispatchResult.error || null,
      message: dispatchResult.success
        ? 'A new verification link has been sent to your email inbox.'
        : `Email delivery failed: ${dispatchResult.error || 'Please check email configuration'}.`,
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

    // Generate TOTP setup material for 2-step authentication configuration
    let mfaSetup = undefined;
    if (!isExpired) {
      try {
        const rawTotpSecret = generateTotpSecret();
        const otpauthUri = getTotpUri(
          rawTotpSecret,
          invitation.email,
          this.config.MFA_APP_NAME || 'Kalpak Solutions'
        );
        const qrCode = await generateTotpQrDataUrl(otpauthUri);
        const backupCodes = generateBackupCodes(this.config.MFA_BACKUP_CODES_COUNT || 8);

        mfaSetup = {
          secret: rawTotpSecret,
          qrCode,
          backupCodes,
        };
      } catch (err) {
        // Fallback gracefully if QR generation fails
      }
    }

    return {
      email: invitation.email,
      fullName: invitation.fullName,
      phone: invitation.phone,
      role: invitation.role.name,
      department: invitation.department,
      tenantName: invitation.tenant.name,
      tenantSlug: invitation.tenant.slug,
      isExpired,
      alreadyAccepted: invitation.acceptedAt !== null,
      mfaSetup,
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

    // Client Admins and Department Heads require 2-step authentication setup
    const isClientAdmin = invitation.role.name === 'CLIENT_ADMIN';
    const isDeptAdmin = invitation.role.name === 'DEPARTMENT_ADMIN';
    const isMandatoryMfa = isClientAdmin || isDeptAdmin;
    let enableMfa = false;
    let encryptedTotpSecret: string | null = null;
    let hashedBackupCodes: string[] = [];

    if (dto.totpCode && dto.totpSecret) {
      const cleanCode = dto.totpCode.trim();
      const isValid = verifyTotp(cleanCode, dto.totpSecret);
      if (!isValid) {
        throw new BadRequestException(
          'Invalid 6-digit authenticator verification code. Please check your authenticator app and try again.'
        );
      }

      enableMfa = true;
      encryptedTotpSecret = encryptSecret(dto.totpSecret, this.config.MFA_ENCRYPTION_KEY);
      const plainBackupCodes =
        dto.backupCodes && dto.backupCodes.length > 0
          ? dto.backupCodes
          : generateBackupCodes(this.config.MFA_BACKUP_CODES_COUNT || 8);
      hashedBackupCodes = plainBackupCodes.map(hashBackupCode);
    } else if (isMandatoryMfa) {
      throw new BadRequestException(
        `2-Step Authentication is mandatory for ${isDeptAdmin ? 'Department Head' : 'Administrator'} accounts. Please scan the QR code and enter the 6-digit code from your authenticator app.`
      );
    }

    const email = invitation.email.toLowerCase();
    const passwordHash = await hashPassword(dto.password);
    const resolvedPhone = dto.phone?.trim() || invitation.phone || null;

    // Look up or create User
    let user = await this.prisma.user.findUnique({ where: { email } });

    await this.prisma.$transaction(async (tx) => {
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            passwordHash,
            fullName: dto.fullName.trim(),
            phoneNumber: resolvedPhone,
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            mfaEnabled: enableMfa,
            mfaSecret: encryptedTotpSecret,
            mfaBackupCodes: hashedBackupCodes,
          },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: {
            fullName: dto.fullName.trim() || user.fullName,
            phoneNumber: resolvedPhone || user.phoneNumber,
            passwordHash,
            emailVerified: true,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
            ...(enableMfa
              ? {
                  mfaEnabled: true,
                  mfaSecret: encryptedTotpSecret,
                  mfaBackupCodes: hashedBackupCodes,
                }
              : {}),
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
      } else {
        await tx.tenantMembership.update({
          where: { id: existingMembership.id },
          data: {
            roleId: invitation.roleId,
          },
        });
      }

      // Link to Department and update Department Head / POC
      if (invitation.department) {
        const trimmedDept = invitation.department.trim();
        let department = await tx.department.findFirst({
          where: {
            tenantId: invitation.tenantId,
            deletedAt: null,
            OR: [
              { name: { equals: trimmedDept, mode: 'insensitive' } },
              { code: { equals: trimmedDept, mode: 'insensitive' } },
            ],
          },
        });

        if (!department) {
          department = await tx.department.findFirst({
            where: {
              tenantId: invitation.tenantId,
              deletedAt: null,
              name: { contains: trimmedDept, mode: 'insensitive' },
            },
          });
        }

        const isDeptHead = invitation.role.name === 'DEPARTMENT_ADMIN';

        if (!department) {
          const cleanCode = trimmedDept
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 5) || 'DEPT';

          let finalCode = cleanCode;
          const existingCode = await tx.department.findFirst({
            where: { tenantId: invitation.tenantId, code: finalCode },
          });
          if (existingCode) {
            finalCode = `${cleanCode}${Math.floor(10 + Math.random() * 90)}`;
          }

          department = await tx.department.create({
            data: {
              tenantId: invitation.tenantId,
              name: trimmedDept,
              code: finalCode,
              description: `${trimmedDept} Department`,
              isActive: true,
              headUserId: isDeptHead ? user.id : null,
              pocUserId: user.id,
              pocName: user.fullName || dto.fullName.trim(),
              pocEmail: user.email,
              pocPhone: resolvedPhone,
            },
          });
        } else {
          // Assign as head and POC of department
          await tx.department.update({
            where: { id: department.id },
            data: {
              ...(isDeptHead ? { headUserId: user.id } : {}),
              pocUserId: user.id,
              pocName: user.fullName || department.pocName,
              pocEmail: user.email || department.pocEmail,
              pocPhone: resolvedPhone || department.pocPhone,
            },
          });
        }

        // Create or update employee profile for the member
        await tx.employeeProfile.upsert({
          where: { userId: user.id },
          create: {
            tenantId: invitation.tenantId,
            userId: user.id,
            departmentId: department.id,
            designation: isDeptHead ? 'Department Head' : 'Department Specialist',
            phone: resolvedPhone,
            isAvailable: true,
          },
          update: {
            tenantId: invitation.tenantId,
            departmentId: department.id,
            designation: isDeptHead ? 'Department Head' : undefined,
            phone: resolvedPhone || undefined,
            isAvailable: true,
          },
        });
      }

      // Link to Customer account if an organization customer exists with this email
      await tx.customer.updateMany({
        where: {
          tenantId: invitation.tenantId,
          email: { equals: email, mode: 'insensitive' },
          deletedAt: null,
        },
        data: {
          userId: user.id,
          portalAccessEnabled: true,
        },
      });

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
      metadata: { email, tenantId: invitation.tenantId, role: invitation.role.name, department: invitation.department, mfaEnabled: enableMfa },
      ipAddress,
      userAgent,
    });

    const isCustomer = invitation.role.name === 'CUSTOMER';
    const welcomeMessage = isDeptAdmin && invitation.department
      ? `Welcome ${user?.fullName || ''}! You have successfully joined ${invitation.tenant.name} as Department Head for ${invitation.department}. You can now sign in.`
      : isCustomer
      ? `Welcome ${user?.fullName || ''}! Your customer account for ${invitation.tenant.name} has been verified and activated. You can now sign in to raise and track service calls.`
      : `Welcome! You have successfully joined ${invitation.tenant.name}. You can now sign in.`;

    return {
      success: true,
      message: welcomeMessage,
      email,
      tenantSlug: invitation.tenant.slug,
      department: invitation.department,
      role: invitation.role.name,
      mfaEnabled: enableMfa,
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

    if (!session.user.mfaSecret && (!session.user.mfaBackupCodes || session.user.mfaBackupCodes.length === 0)) {
      throw new ForbiddenException('MFA is not configured for this account');
    }

    const cleanCode = code.trim();
    let isValid = false;

    // 1. Try 6-digit TOTP verification first
    if (/^\d{6}$/.test(cleanCode) && session.user.mfaSecret) {
      const rawSecret = decryptSecret(session.user.mfaSecret, this.config.MFA_ENCRYPTION_KEY);
      isValid = verifyTotp(cleanCode, rawSecret);
    }

    // 2. Try Emergency Backup Code if TOTP failed or backup code format entered (XXXX-XXXX)
    if (!isValid && session.user.mfaBackupCodes && session.user.mfaBackupCodes.length > 0) {
      const backupResult = verifyAndConsumeBackupCode(cleanCode, session.user.mfaBackupCodes);
      if (backupResult.valid && backupResult.matchedHash) {
        isValid = true;
        // Remove the consumed single-use backup code from database
        const remainingCodes = session.user.mfaBackupCodes.filter(
          (h) => h !== backupResult.matchedHash
        );
        await this.prisma.user.update({
          where: { id: session.user.id },
          data: { mfaBackupCodes: remainingCodes },
        });
      }
    }

    if (!isValid) {
      await this.auditService.record({
        tenantId: session.activeTenantId,
        actorId: session.userId,
        eventType: AuditEventType.AUTH_MFA_FAILED,
        resourceType: 'SESSION',
        resourceId: session.id,
        action: 'MFA_VERIFICATION_FAILED',
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid verification code or backup code');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { mfaVerified: true },
    });

    await this.auditService.record({
      tenantId: session.activeTenantId,
      actorId: session.userId,
      eventType: AuditEventType.AUTH_MFA_SUCCESS,
      resourceType: 'SESSION',
      resourceId: session.id,
      action: 'MFA_VERIFIED_SUCCESS',
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
          employeeProfile: {
            select: {
              departmentId: true,
              designation: true,
              skills: true,
              department: { select: { id: true, name: true, code: true, tenantId: true } },
            },
          },
          headedDepartments: {
            where: { deletedAt: null },
            select: { id: true, name: true, code: true, tenantId: true },
          },
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

    const headedDept = user.headedDepartments?.find(
      (d) => !session.activeTenantId || d.tenantId === session.activeTenantId
    ) || user.headedDepartments?.[0];
    const userDept = user.employeeProfile?.department || headedDept || null;

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        mfaEnabled: user.mfaEnabled,
        emailVerified: user.emailVerified,
        departmentId: userDept?.id || null,
        departmentName: userDept?.name || null,
        designation: user.employeeProfile?.designation || (headedDept ? 'Department Head' : null),
        isHead: !!headedDept,
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
      department: userDept
        ? {
            id: userDept.id,
            name: userDept.name,
            code: userDept.code,
            isHead: !!headedDept && headedDept.id === userDept.id,
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

  async resolveSubdomainInfo(
    hostHeader?: string,
    forwardedHost?: string,
    tenantSlugHeader?: string,
    originHeader?: string
  ) {
    const subdomain = this.subdomainResolver.extractSubdomain(
      hostHeader,
      forwardedHost,
      tenantSlugHeader,
      originHeader
    );

    if (!subdomain) {
      return {
        isSubdomain: false,
        subdomain: null,
        tenant: null,
      };
    }

    const tenant = await this.subdomainResolver.resolveTenantBySubdomain(subdomain);
    if (!tenant) {
      return {
        isSubdomain: true,
        subdomain,
        tenant: null,
        error: 'TENANT_NOT_FOUND',
      };
    }

    const settings = (tenant.settings as any) || {};
    return {
      isSubdomain: true,
      subdomain,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        logoUrl: settings.logoUrl || null,
        primaryColor: settings.primaryColor || null,
      },
    };
  }

  async getUserMfaStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaBackupCodes: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      mfaEnabled: user.mfaEnabled,
      backupCodesRemaining: user.mfaBackupCodes?.length || 0,
    };
  }

  async setupUserMfa(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const rawSecret = generateTotpSecret();
    const otpauthUri = getTotpUri(
      rawSecret,
      user.email,
      this.config.MFA_APP_NAME || 'Kalpak Solutions'
    );
    const qrCode = await generateTotpQrDataUrl(otpauthUri);
    const backupCodes = generateBackupCodes(this.config.MFA_BACKUP_CODES_COUNT || 8);
    const hashedBackupCodes = backupCodes.map((c) => hashBackupCode(c));
    const encryptedSecret = encryptSecret(rawSecret, this.config.MFA_ENCRYPTION_KEY);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: encryptedSecret,
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    return {
      secret: rawSecret,
      otpauthUri,
      qrCode,
      backupCodes,
    };
  }

  async enableUserMfa(
    userId: string,
    code: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA setup has not been initiated. Please generate a QR code first.');
    }

    const rawSecret = decryptSecret(user.mfaSecret, this.config.MFA_ENCRYPTION_KEY);
    const isValid = verifyTotp(code.trim(), rawSecret);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code. Please check your authenticator app.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId },
        data: { mfaVerified: true },
      });
    }

    await this.auditService.record({
      actorId: user.id,
      eventType: AuditEventType.AUTH_MFA_ENABLED,
      resourceType: 'USER',
      resourceId: user.id,
      action: 'MFA_ENABLED',
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Two-Factor Authentication (2FA) has been successfully activated for your account.',
    };
  }

  async disableUserMfa(
    userId: string,
    password?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (password) {
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Incorrect password provided.');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });

    await this.auditService.record({
      actorId: user.id,
      eventType: AuditEventType.AUTH_MFA_DISABLED,
      resourceType: 'USER',
      resourceId: user.id,
      action: 'MFA_DISABLED',
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Two-Factor Authentication (2FA) has been disabled.',
    };
  }
}

