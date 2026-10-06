import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubdomainResolverService } from '../src/core/tenant/subdomain-resolver.service';
import { TenantGuard } from '../src/core/tenant/tenant.guard';
import { PrismaService } from '../src/core/database/prisma.service';
import { TenantStatus, SystemRole, PermissionCode } from '@kalpak/types';

describe('Production Multi-Tenant Subdomain Routing & Security', () => {
  let subdomainResolver: SubdomainResolverService;
  let tenantGuard: TenantGuard;
  let mockPrisma: any;
  let mockReflector: Reflector;

  const mockTenantA = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Acme Corporation',
    slug: 'acme',
    status: TenantStatus.ACTIVE,
    deletedAt: null,
  };

  const mockTenantB = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Globex Industries',
    slug: 'globex',
    status: TenantStatus.ACTIVE,
    deletedAt: null,
  };

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findUnique: jest.fn(),
      },
      tenantMembership: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
      $executeRawUnsafe: jest.fn(),
    };

    mockReflector = new Reflector();
    jest.spyOn(mockReflector, 'getAllAndOverride').mockReturnValue(false);

    subdomainResolver = new SubdomainResolverService(mockPrisma as unknown as PrismaService);
    tenantGuard = new TenantGuard(mockReflector, mockPrisma as unknown as PrismaService, subdomainResolver);
  });

  describe('1. Subdomain Detection, Validation & Reserved Slugs', () => {
    it('should detect tenant subdomain from production custom domain (company-slug.kalpaksolutions.com)', () => {
      const slug = subdomainResolver.extractSubdomain('acme.kalpaksolutions.com');
      expect(slug).toBe('acme');
    });

    it('should detect tenant subdomain from forwarded host header in reverse-proxy environments', () => {
      const slug = subdomainResolver.extractSubdomain(undefined, 'globex.kalpaksolutions.com');
      expect(slug).toBe('globex');
    });

    it('should detect tenant subdomain from local development host (.localhost)', () => {
      const slug = subdomainResolver.extractSubdomain('initech.localhost:3000');
      expect(slug).toBe('initech');
    });

    it('should return null for apex custom domain (kalpaksolutions.com)', () => {
      const slug = subdomainResolver.extractSubdomain('kalpaksolutions.com');
      expect(slug).toBeNull();
    });

    it('should return null for plain localhost without subdomain', () => {
      const slug = subdomainResolver.extractSubdomain('localhost:4000');
      expect(slug).toBeNull();
    });

    it('should return null for IP addresses', () => {
      expect(subdomainResolver.extractSubdomain('127.0.0.1:4000')).toBeNull();
      expect(subdomainResolver.extractSubdomain('192.168.1.50')).toBeNull();
    });

    it('should block reserved platform subdomains from resolving as tenants', () => {
      expect(subdomainResolver.extractSubdomain('www.kalpaksolutions.com')).toBeNull();
      expect(subdomainResolver.extractSubdomain('api.kalpaksolutions.com')).toBeNull();
      expect(subdomainResolver.extractSubdomain('admin.kalpaksolutions.com')).toBeNull();
      expect(subdomainResolver.extractSubdomain('super-admin.kalpaksolutions.com')).toBeNull();
      expect(subdomainResolver.extractSubdomain('superadmin.kalpaksolutions.com')).toBeNull();
      expect(subdomainResolver.extractSubdomain('dashboard.kalpaksolutions.com')).toBeNull();
      expect(subdomainResolver.extractSubdomain('billing.kalpaksolutions.com')).toBeNull();
      expect(subdomainResolver.extractSubdomain('auth.kalpaksolutions.com')).toBeNull();
      expect(subdomainResolver.extractSubdomain('login.kalpaksolutions.com')).toBeNull();
    });

    it('should reject invalid, malicious, or malformed subdomain slugs', () => {
      expect(subdomainResolver.isValidSubdomainSlug('../evil')).toBe(false);
      expect(subdomainResolver.isValidSubdomainSlug('slug.with.dots')).toBe(false);
      expect(subdomainResolver.isValidSubdomainSlug('slug_with_underscores')).toBe(false);
      expect(subdomainResolver.isValidSubdomainSlug('-starting-hyphen')).toBe(false);
      expect(subdomainResolver.isValidSubdomainSlug('ending-hyphen-')).toBe(false);
      expect(subdomainResolver.isValidSubdomainSlug('a')).toBe(false); // < 2 chars
      expect(subdomainResolver.isValidSubdomainSlug('a'.repeat(64))).toBe(false); // > 63 chars
      expect(subdomainResolver.isValidSubdomainSlug('valid-slug-123')).toBe(true);
    });
  });

  describe('2. Cross-Tenant URL Manipulation & Direct Access Attempts', () => {
    function createMockContext(request: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
    }

    it('should REJECT with 403 FORBIDDEN_CROSS_TENANT if a user alters the URL to another company subdomain', async () => {
      // Mock tenant lookup for globex (subdomain in request)
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenantB);

      const request = {
        headers: {
          host: 'globex.kalpaksolutions.com',
        },
        user: {
          id: 'user-acme-1',
          email: 'admin@acme.com',
          isSuperAdmin: false,
        },
        session: {
          id: 'sess-1',
          activeTenantId: mockTenantA.id, // User belongs to Acme!
        },
      };

      const context = createMockContext(request);

      try {
        await tenantGuard.canActivate(context);
        fail('Should have thrown ForbiddenException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.response?.code).toBe('FORBIDDEN_CROSS_TENANT');
        expect(err.response?.authorizedTenantId).toBe(mockTenantA.id);
        expect(err.response?.requestedTenantId).toBe(mockTenantB.id);
      }
    });

    it('should REJECT with 403 TENANT_NOT_FOUND if user accesses an unknown or deactivated subdomain', async () => {
      // Database finds no tenant for 'nonexistent'
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      const request = {
        headers: {
          host: 'nonexistent.kalpaksolutions.com',
        },
        user: {
          id: 'user-1',
          isSuperAdmin: false,
        },
        session: {
          id: 'sess-1',
          activeTenantId: mockTenantA.id,
        },
      };

      const context = createMockContext(request);

      await expect(tenantGuard.canActivate(context)).rejects.toThrow(ForbiddenException);

      try {
        await tenantGuard.canActivate(context);
      } catch (err: any) {
        expect(err.response?.code).toBe('TENANT_NOT_FOUND');
      }
    });

    it('should ALLOW access when hostnameTenantId matches sessionUserTenantId and user has membership', async () => {
      // Mock tenant lookup for acme
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenantA);

      // Mock membership lookup for acme user
      mockPrisma.tenantMembership.findUnique.mockResolvedValueOnce({
        id: 'mem-1',
        tenantId: mockTenantA.id,
        userId: 'user-acme-1',
        role: {
          name: SystemRole.CLIENT_ADMIN,
          permissions: [{ permission: { code: PermissionCode.TICKET_READ } }],
        },
      });

      const request: any = {
        headers: {
          host: 'acme.kalpaksolutions.com',
        },
        user: {
          id: 'user-acme-1',
          email: 'admin@acme.com',
          isSuperAdmin: false,
        },
        session: {
          id: 'sess-1',
          activeTenantId: mockTenantA.id, // Matches host subdomain!
        },
      };

      const context = createMockContext(request);
      const canActivate = await tenantGuard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(request.resolvedTenantId).toBe(mockTenantA.id);
      expect(request.tenantMembership.id).toBe('mem-1');
    });

    it('should REQUIRE authentication on protected tenant routes', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenantA);

      const request = {
        headers: {
          host: 'acme.kalpaksolutions.com',
        },
        user: null, // Unauthenticated!
        session: null,
      };

      const context = createMockContext(request);
      await expect(tenantGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('3. Super Admin Platform Isolation (Requirement 10)', () => {
    function createMockContext(request: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
    }

    it('should NOT allow Super Admin to accidentally inherit tenant workspace access without explicit membership', async () => {
      // Super Admin attempts to access Acme workspace directly
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenantA);
      // Super Admin has NO membership in Acme
      mockPrisma.tenantMembership.findUnique.mockResolvedValueOnce(null);

      const request = {
        headers: {
          host: 'acme.kalpaksolutions.com',
        },
        user: {
          id: 'super-admin-root',
          email: 'root@kalpaksolutions.com',
          isSuperAdmin: true,
        },
        session: {
          id: 'sess-super',
          activeTenantId: mockTenantA.id,
        },
      };

      const context = createMockContext(request);

      // Must be rejected because Super Admin must remain platform-level and cannot inherit tenant data
      await expect(tenantGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('4. PostgreSQL RLS Context Injection Security', () => {
    it('should throw an error if an invalid non-UUID tenant ID is provided to withTenantContext', async () => {
      const prismaService = new PrismaService();

      await expect(
        prismaService.withTenantContext("'; DROP TABLE users; --", false, async () => {
          return true;
        })
      ).rejects.toThrow('Invalid tenant ID format for RLS context');
    });
  });
});
