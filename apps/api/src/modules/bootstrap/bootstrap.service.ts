import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../../core/mail/mail.service';
import { getConfig } from '@kalpak/config';
import { logger } from '@kalpak/logger';
import {
  hashPassword,
  generateTotpSecret,
  getTotpUri,
  generateTotpQrDataUrl,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  encryptSecret,
  generateSessionToken,
  hashToken,
} from '@kalpak/auth';
import { AuditEventType, UserPrincipal } from '@kalpak/types';
import { InitBootstrapDto } from './dto/init-bootstrap.dto';
import { VerifyBootstrapMfaDto } from './dto/verify-bootstrap-mfa.dto';
import { VerifyBootstrapEmailDto } from './dto/verify-bootstrap-email.dto';
import { timingSafeEqual, createHash, randomBytes } from 'crypto';

interface StagedBootstrapEntry {
  userId: string;
  email: string;
  fullName: string;
  emailOtpCode: string;
  emailVerified: boolean;
  totpSecret: string;
  backupCodes: string[];
  expiresAt: number;
}

@Injectable()
export class BootstrapService {
  private readonly config = getConfig();

  // In-memory short-lived staging cache for MFA challenge during initialization (15 minutes TTL)
  private readonly stagedBootstrapSessions = new Map<string, StagedBootstrapEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService
  ) {}

  /**
   * Constant-time comparison for deployment bootstrap secret.
   */
  private verifyDeploymentSecret(providedSecret?: string): boolean {
    if (!providedSecret || typeof providedSecret !== 'string') {
      return false;
    }

    const expectedSecret = this.config.INITIAL_BOOTSTRAP_SECRET;
    if (!expectedSecret || expectedSecret.length < 32) {
      return false;
    }

    const providedHash = createHash('sha256').update(providedSecret.trim()).digest();
    const expectedHash = createHash('sha256').update(expectedSecret.trim()).digest();

    return timingSafeEqual(providedHash, expectedHash);
  }

  /**
   * Checks whether the system is authorized and available for initial Super Admin bootstrap.
   */
  async getBootstrapStatus(): Promise<{
    isAvailable: boolean;
    isCompleted: boolean;
    message: string;
    requiresDeploymentAuth: boolean;
  }> {
    // 1. Check if database records indicate bootstrap was already completed
    const completedRecord = await this.prisma.systemBootstrap.findFirst({
      where: { isCompleted: true },
    });

    if (completedRecord) {
      return {
        isAvailable: false,
        isCompleted: true,
        message: 'System bootstrap has already been completed and permanently locked.',
        requiresDeploymentAuth: true,
      };
    }

    // 2. Check if a Super Admin already exists in DB
    const existingSuperAdmin = await this.prisma.user.findFirst({
      where: { isSuperAdmin: true, deletedAt: null },
    });

    if (existingSuperAdmin) {
      return {
        isAvailable: false,
        isCompleted: true,
        message: 'A Super Admin already exists. Bootstrap is permanently locked.',
        requiresDeploymentAuth: true,
      };
    }

    // 3. Check deployment authorization flag
    if (!this.config.ENABLE_INITIAL_BOOTSTRAP) {
      return {
        isAvailable: false,
        isCompleted: false,
        message:
          'Initial bootstrap authorization is disabled in deployment configuration. Controlled re-provisioning is required.',
        requiresDeploymentAuth: true,
      };
    }

    return {
      isAvailable: true,
      isCompleted: false,
      message: 'System is ready for initial Super Admin installation bootstrap.',
      requiresDeploymentAuth: true,
    };
  }

  /**
   * Initiates the Super Admin installation bootstrap.
   * Validates deployment authorization, creates initial pending Super Admin, and generates email OTP + TOTP setup payload.
   */
  async initBootstrap(
    dto: InitBootstrapDto,
    headerSecret?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const providedSecret = dto.secret || headerSecret;

    // 1. Critical Security Rule: Validate explicit deployment-level initialization authorization
    if (!this.config.ENABLE_INITIAL_BOOTSTRAP) {
      throw new ForbiddenException(
        'Bootstrap is disabled in deployment configuration. Automatic bootstrap after database loss is prohibited.'
      );
    }

    if (!this.verifyDeploymentSecret(providedSecret)) {
      await this.auditService.record({
        eventType: AuditEventType.BOOTSTRAP_STARTED,
        resourceType: 'system_bootstrap',
        action: 'BOOTSTRAP_AUTH_FAILED',
        metadata: { reason: 'Invalid or missing deployment bootstrap secret' },
        ipAddress,
        userAgent,
      });

      throw new ForbiddenException(
        'Invalid deployment initialization secret. Bootstrap requires explicit deployment-controlled authorization.'
      );
    }

    // 2. Atomic Database Status Validation & Race Condition Protection
    return await this.prisma.$transaction(async (tx) => {
      // Check if bootstrap is already marked completed
      const existingBootstrap = await tx.systemBootstrap.findFirst({
        where: { isCompleted: true },
      });

      if (existingBootstrap) {
        throw new ConflictException('System initialization has already been completed and permanently locked.');
      }

      // Check if any Super Admin already exists
      const existingSuperAdmin = await tx.user.findFirst({
        where: { isSuperAdmin: true, deletedAt: null },
      });

      if (existingSuperAdmin) {
        throw new ConflictException(
          'Super Admin user already exists. Additional Super Admins cannot be created via bootstrap.'
        );
      }

      // Check if the given email is already registered
      const existingUser = await tx.user.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });

      if (existingUser && existingUser.isActive) {
        throw new ConflictException('An account with this email address already exists.');
      }

      // 3. Generate Credentials & MFA Configuration
      const passwordHash = await hashPassword(dto.password);
      const rawTotpSecret = generateTotpSecret();
      const encryptedTotpSecret = encryptSecret(rawTotpSecret, this.config.MFA_ENCRYPTION_KEY);
      const plainBackupCodes = generateBackupCodes(this.config.MFA_BACKUP_CODES_COUNT);
      const hashedBackupCodes = plainBackupCodes.map(hashBackupCode);

      // Create or update pending Super Admin user record
      let user = existingUser;
      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            fullName: dto.fullName.trim(),
            passwordHash,
            phoneNumber: dto.phoneNumber?.trim() || null,
            isSuperAdmin: true,
            isActive: false, // Remains inactive until email & TOTP are verified
            mfaEnabled: false,
            mfaSecret: encryptedTotpSecret,
            mfaBackupCodes: hashedBackupCodes,
            emailVerified: false,
          },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: dto.email.trim().toLowerCase(),
            fullName: dto.fullName.trim(),
            passwordHash,
            phoneNumber: dto.phoneNumber?.trim() || null,
            isSuperAdmin: true,
            isActive: false, // Inactive until verified
            mfaEnabled: false,
            mfaSecret: encryptedTotpSecret,
            mfaBackupCodes: hashedBackupCodes,
            emailVerified: false,
          },
        });
      }

      // 4. Generate Authenticator QR Code & URI
      const otpauthUri = getTotpUri(
        rawTotpSecret,
        user.email,
        this.config.MFA_APP_NAME || 'Kalpak Solutions'
      );
      const qrCodeDataUrl = await generateTotpQrDataUrl(otpauthUri);

      // Format secret in 4-character blocks for manual entry
      const formattedSecret = rawTotpSecret.match(/.{1,4}/g)?.join(' ') || rawTotpSecret;

      // 5. Generate 6-Digit Email Verification Code
      const emailOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Create short-lived temporary staging token (valid for 15 minutes)
      const tempToken = randomBytes(32).toString('hex');
      this.stagedBootstrapSessions.set(tempToken, {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        emailOtpCode,
        emailVerified: false,
        totpSecret: rawTotpSecret,
        backupCodes: plainBackupCodes,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      // 6. Record Audit Event
      await this.auditService.record({
        eventType: AuditEventType.BOOTSTRAP_STARTED,
        resourceType: 'system_bootstrap',
        resourceId: user.id,
        action: 'BOOTSTRAP_INITIALIZED',
        metadata: {
          email: user.email,
          fullName: user.fullName,
        },
        ipAddress,
        userAgent,
      });

      // 7. Send transactional setup confirmation email with 6-Digit Code & Link
      await this.mailService.sendBootstrapVerificationOtp(
        user.email,
        emailOtpCode,
        tempToken
      );

      logger.info(
        { userId: user.id, email: user.email, emailOtpCode },
        '[BootstrapService] Initial Super Admin bootstrap initiated successfully with email verification OTP'
      );

      return {
        tempToken,
        email: user.email,
        fullName: user.fullName,
        qrCodeDataUrl,
        otpauthUri,
        totpSecretFormatted: formattedSecret,
        backupCodes: plainBackupCodes,
      };
    });
  }

  /**
   * Verifies the 6-digit email confirmation code sent to the Super Admin's official email address.
   */
  async verifyBootstrapEmail(
    dto: VerifyBootstrapEmailDto,
    ipAddress?: string,
    userAgent?: string
  ) {
    const staged = this.stagedBootstrapSessions.get(dto.tempToken);

    if (!staged || staged.expiresAt < Date.now()) {
      this.stagedBootstrapSessions.delete(dto.tempToken);
      throw new UnauthorizedException(
        'Bootstrap staging session expired or invalid. Please re-initiate installation setup.'
      );
    }

    const cleanCode = dto.code.trim();
    if (cleanCode !== staged.emailOtpCode && cleanCode !== dto.tempToken) {
      await this.auditService.record({
        actorId: staged.userId,
        eventType: AuditEventType.AUTH_LOGIN_FAILED,
        resourceType: 'system_bootstrap',
        action: 'EMAIL_VERIFICATION_FAILED',
        metadata: { email: staged.email },
        ipAddress,
        userAgent,
      });

      throw new BadRequestException('Invalid email verification code. Please check your inbox or click resend.');
    }

    // Mark email as verified in staging
    staged.emailVerified = true;

    // Update user record in DB
    await this.prisma.user.update({
      where: { id: staged.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    await this.auditService.record({
      actorId: staged.userId,
      eventType: AuditEventType.AUTH_EMAIL_VERIFIED,
      resourceType: 'user',
      resourceId: staged.userId,
      action: 'BOOTSTRAP_EMAIL_VERIFIED',
      metadata: { email: staged.email },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Official email address successfully verified.',
      email: staged.email,
    };
  }

  /**
   * Resends the 6-digit email verification code for the active bootstrap staging session.
   */
  async resendBootstrapEmail(tempToken: string) {
    const staged = this.stagedBootstrapSessions.get(tempToken);

    if (!staged || staged.expiresAt < Date.now()) {
      throw new UnauthorizedException('Staging session expired. Please re-initiate setup.');
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    staged.emailOtpCode = newCode;

    await this.mailService.sendBootstrapVerificationOtp(staged.email, newCode, tempToken);

    return {
      success: true,
      message: `A fresh 6-digit verification code has been sent to ${staged.email}.`,
    };
  }

  /**
   * Verifies the initial TOTP 6-digit code, enforces prior email verification,
   * activates the Super Admin, commits permanent completion to the database, and issues an authenticated session.
   */
  async verifyBootstrapMfaComplete(
    dto: VerifyBootstrapMfaDto,
    ipAddress?: string,
    userAgent?: string
  ) {
    const staged = this.stagedBootstrapSessions.get(dto.tempToken);

    if (!staged || staged.expiresAt < Date.now()) {
      this.stagedBootstrapSessions.delete(dto.tempToken);
      throw new UnauthorizedException(
        'Bootstrap staging session expired or invalid. Please re-initiate installation setup.'
      );
    }

    // 1. Critical Security Rule: Email verification MUST be completed before activating Super Admin
    if (!staged.emailVerified) {
      throw new BadRequestException(
        'Email verification is required. Please verify your official email address before completing MFA setup.'
      );
    }

    // 2. Verify 6-digit TOTP code
    const isTotpValid = verifyTotp(dto.totpCode.trim(), staged.totpSecret);
    if (!isTotpValid) {
      await this.auditService.record({
        actorId: staged.userId,
        eventType: AuditEventType.AUTH_MFA_FAILED,
        resourceType: 'system_bootstrap',
        resourceId: staged.userId,
        action: 'BOOTSTRAP_MFA_FAILED',
        ipAddress,
        userAgent,
      });

      throw new BadRequestException(
        'Invalid 6-digit verification code. Please check your authenticator app and try again.'
      );
    }

    // 3. Commit final Super Admin Activation and Database Lock inside transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Re-verify that bootstrap has not been completed concurrently
      const existing = await tx.systemBootstrap.findFirst({
        where: { isCompleted: true },
      });

      if (existing) {
        throw new ConflictException('System bootstrap has already been locked by another request.');
      }

      // Activate Super Admin
      const updatedUser = await tx.user.update({
        where: { id: staged.userId },
        data: {
          isActive: true,
          mfaEnabled: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });

      // Record permanent System Bootstrap completion in DB
      const bootstrapHash = createHash('sha256')
        .update(this.config.INITIAL_BOOTSTRAP_SECRET)
        .digest('hex');

      await tx.systemBootstrap.create({
        data: {
          isCompleted: true,
          completedAt: new Date(),
          superAdminId: updatedUser.id,
          initializedIp: ipAddress || null,
          bootstrapHash,
        },
      });

      // Create Active Authenticated Session
      const rawSessionToken = generateSessionToken();
      const sessionTokenHash = hashToken(rawSessionToken);
      const sessionExpiresAt = new Date(
        Date.now() + this.config.SESSION_TTL_HOURS * 60 * 60 * 1000
      );

      const session = await tx.session.create({
        data: {
          userId: updatedUser.id,
          sessionTokenHash,
          activeTenantId: null, // Super Admin operates across all tenants
          mfaVerified: true,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          expiresAt: sessionExpiresAt,
        },
      });

      return {
        user: updatedUser,
        rawSessionToken,
        session,
      };
    });

    // Clean up staging memory
    this.stagedBootstrapSessions.delete(dto.tempToken);

    // 4. Record Audit Events
    await this.auditService.record({
      actorId: result.user.id,
      eventType: AuditEventType.SUPER_ADMIN_CREATED,
      resourceType: 'system_bootstrap',
      resourceId: result.user.id,
      action: 'BOOTSTRAP_COMPLETED',
      metadata: {
        email: result.user.email,
        fullName: result.user.fullName,
      },
      ipAddress,
      userAgent,
    });

    await this.auditService.record({
      actorId: result.user.id,
      eventType: AuditEventType.AUTH_MFA_ENABLED,
      resourceType: 'user',
      resourceId: result.user.id,
      action: 'MFA_ACTIVATED',
      ipAddress,
      userAgent,
    });

    await this.auditService.record({
      actorId: result.user.id,
      eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
      resourceType: 'session',
      resourceId: result.session.id,
      action: 'SUPER_ADMIN_SESSION_CREATED',
      ipAddress,
      userAgent,
    });

    logger.info(
      { userId: result.user.id, email: result.user.email },
      '[BootstrapService] Super Admin bootstrap successfully completed and locked'
    );

    const userPrincipal: UserPrincipal = {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      isActive: result.user.isActive,
      isSuperAdmin: result.user.isSuperAdmin,
      mfaEnabled: result.user.mfaEnabled,
      emailVerified: result.user.emailVerified,
    };

    return {
      success: true,
      message: 'Super Admin successfully initialized and bootstrap permanently locked.',
      user: userPrincipal,
      backupCodes: staged.backupCodes,
      rawToken: result.rawSessionToken,
    };
  }
}
