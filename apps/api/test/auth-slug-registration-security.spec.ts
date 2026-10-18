import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { SubdomainResolverService } from '../src/core/tenant/subdomain-resolver.service';
import { PrismaService } from '../src/core/database/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { MailService } from '../src/core/mail/mail.service';
import { SystemRole } from '@kalpak/types';
import { hashPassword } from '@kalpak/auth';
import { RateLimiterGuard } from '../src/core/auth/rate-limiter.guard';
import { Reflector } from '@nestjs/core';

describe('Auth Organization Slug & Email Verification Security', () => {
  let authService: AuthService;
  let subdomainResolver: SubdomainResolverService;
  let mockPrisma: any;
  let mockAuditService: any;
  let mockMailService: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'tenant-test-uuid', name: 'Test Corp', slug: 'test-corp' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'user-test-uuid', email: 'admin@testcorp.com', emailVerified: false }),
        update: jest.fn().mockResolvedValue({ id: 'user-test-uuid', emailVerified: true }),
      },
      role: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'role-admin-uuid',
          name: SystemRole.CLIENT_ADMIN,
          permissions: [{ permission: { code: 'tenant:read' } }],
        }),
      },
      tenantMembership: {
        create: jest.fn().mockResolvedValue({ id: 'member-test-uuid' }),
      },
      emailVerificationToken: {
        create: jest.fn().mockResolvedValue({ id: 'token-test-uuid', tokenHash: 'dummyhash' }),
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      session: {
        create: jest.fn().mockResolvedValue({ id: 'session-test-uuid' }),
      },
      $transaction: jest.fn((callback) => {
        if (typeof callback === 'function') {
          return callback(mockPrisma);
        }
        return Promise.all(callback);
      }),
      ensureBaselineRbac: jest.fn(),
    };

    mockAuditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    mockMailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };

    subdomainResolver = new SubdomainResolverService(mockPrisma as unknown as PrismaService);
    authService = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockAuditService as unknown as AuditService,
      mockMailService as unknown as MailService,
      subdomainResolver
    );
  });

  describe('1. Reserved Organization Slug Rejection at API Level', () => {
    const reservedSlugs = ['settings', 'admin', 'api', 'login', 'register', 'support', 'pricing', 'checkout', 'config'];

    for (const slug of reservedSlugs) {
      it(`should REJECT registration with reserved slug "${slug}" with BadRequestException`, async () => {
        const signupDto = {
          companyName: 'Test Corp',
          slug,
          fullName: 'Test Admin',
          email: 'admin@testcorp.com',
          password: 'Password123!',
        };

        await expect(authService.signup(signupDto as any)).rejects.toThrow(BadRequestException);
        await expect(authService.signup(signupDto as any)).rejects.toThrow(
          `Organization slug "${slug}" is reserved by the platform`
        );
      });
    }

    it('should REJECT invalid, malformed, or boundary-hyphenated slugs', async () => {
      const invalidSlugs = ['-invalid', 'invalid-', 'in--valid', 'ab', 'a'.repeat(65), 'invalid_slug', 'slug.dots'];

      for (const slug of invalidSlugs) {
        const signupDto = {
          companyName: 'Test Corp',
          slug,
          fullName: 'Test Admin',
          email: 'admin@testcorp.com',
          password: 'Password123!',
        };

        await expect(authService.signup(signupDto as any)).rejects.toThrow(BadRequestException);
      }
    });
  });

  describe('2. Slug Uniqueness & Concurrent P2002 Race Handling', () => {
    it('should throw ConflictException when slug already exists in database pre-check', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'existing-tenant-uuid', slug: 'acme-corp' });

      const signupDto = {
        companyName: 'Acme Corp',
        slug: 'acme-corp',
        fullName: 'Alice Johnson',
        email: 'alice@acme.com',
        password: 'Password123!',
      };

      await expect(authService.signup(signupDto as any)).rejects.toThrow(ConflictException);
      await expect(authService.signup(signupDto as any)).rejects.toThrow(
        'The organization slug "acme-corp" is already taken. Please choose another.'
      );
    });

    it('should catch concurrent database unique collision (P2002) and return clean 409 ConflictException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue(null); // Pre-check passed concurrently!

      // Simulate concurrent transaction collision
      const p2002Error: any = new Error('Unique constraint failed');
      p2002Error.code = 'P2002';
      p2002Error.meta = { target: ['slug'] };

      mockPrisma.$transaction.mockRejectedValue(p2002Error);

      const signupDto = {
        companyName: 'Acme Corp',
        slug: 'acme-racing-slug',
        fullName: 'Alice Johnson',
        email: 'alice@acme.com',
        password: 'Password123!',
      };

      await expect(authService.signup(signupDto as any)).rejects.toThrow(ConflictException);
      await expect(authService.signup(signupDto as any)).rejects.toThrow(
        'The organization slug "acme-racing-slug" is already taken. Please choose another.'
      );
    });
  });

  describe('3. Email Verification Security Lifecycle', () => {
    it('should initialize newly registered user with emailVerified = false', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      mockPrisma.tenant.create.mockResolvedValueOnce({
        id: 'new-tenant-uuid',
        name: 'Safe Tenant',
        slug: 'safe-tenant',
      });

      mockPrisma.user.create.mockImplementationOnce(({ data }: any) => {
        expect(data.emailVerified).toBe(false);
        expect(data.emailVerifiedAt).toBeNull();
        return Promise.resolve({
          id: 'new-user-uuid',
          email: data.email,
          fullName: data.fullName,
          isActive: true,
          emailVerified: false,
          isSuperAdmin: false,
        });
      });

      const signupDto = {
        companyName: 'Safe Tenant',
        slug: 'safe-tenant',
        fullName: 'Bob Smith',
        email: 'bob@safetenant.com',
        password: 'Password123!',
      };

      const result = await authService.signup(signupDto as any);

      expect(result.success).toBe(true);
      expect(result.user.emailVerified).toBe(false);
      expect(result.emailVerificationRequired).toBe(true);
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('should REJECT login for unverified account with ForbiddenException', async () => {
      const validHash = await hashPassword('Password123!');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-unverified-uuid',
        email: 'unverified@example.com',
        passwordHash: validHash,
        isActive: true,
        emailVerified: false, // NOT VERIFIED!
        isSuperAdmin: false,
        memberships: [],
        deletedAt: null,
      });

      const loginDto = {
        email: 'unverified@example.com',
        password: 'Password123!',
      };

      await expect(authService.login(loginDto)).rejects.toThrow(ForbiddenException);
      await expect(authService.login(loginDto)).rejects.toThrow(
        'Please verify your email address before signing in'
      );
    });

    it('should REJECT verifyEmail when token has expired', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValueOnce({
        id: 'token-uuid',
        userId: 'user-uuid',
        email: 'bob@example.com',
        expiresAt: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
        usedAt: null,
      });

      await expect(authService.verifyEmail({ token: 'expired-token-val' })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should safely handle already used tokens without re-verifying', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValueOnce({
        id: 'token-uuid',
        userId: 'user-uuid',
        email: 'bob@example.com',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        usedAt: new Date(Date.now() - 600 * 1000), // Already used!
      });

      const res = await authService.verifyEmail({ token: 'used-token-val' });
      expect(res.success).toBe(true);
      expect(res.message).toContain('already been verified');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('4. RateLimiterGuard Abuse Protection', () => {
    let guard: RateLimiterGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new RateLimiterGuard(reflector);
    });

    it('should allow requests within configured rate limits and block once exceeded with 429', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ points: 3, durationSeconds: 60 });

      const mockRequest = {
        ip: '203.0.113.195',
        headers: {},
        route: { path: '/auth/signup' },
        socket: {},
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      // Requests 1, 2, 3 should be permitted
      expect(guard.canActivate(context)).toBe(true);
      expect(guard.canActivate(context)).toBe(true);
      expect(guard.canActivate(context)).toBe(true);

      // Request 4 should be rejected with 429 Too Many Requests
      expect(() => guard.canActivate(context)).toThrow();
      try {
        guard.canActivate(context);
      } catch (err: any) {
        expect(err.getStatus()).toBe(429);
        expect(err.response?.code).toBe('RATE_LIMIT_EXCEEDED');
      }
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });
  });
});
