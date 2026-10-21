import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { TenantsService } from '../src/modules/tenants/tenants.service';
import { SubdomainResolverService } from '../src/core/tenant/subdomain-resolver.service';
import { PrismaService } from '../src/core/database/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { MailService } from '../src/core/mail/mail.service';
import { SystemRole, TenantStatus } from '@kalpak/types';
import {
  isValidIanaTimezone,
  getSupportedTimezones,
  normalizePhoneNumber,
  getSupportedCountries,
} from '@kalpak/validation';

describe('Company Timezone & International Phone Number Validation', () => {
  let authService: AuthService;
  let tenantsService: TenantsService;
  let subdomainResolver: SubdomainResolverService;
  let mockPrisma: any;
  let mockAuditService: any;
  let mockMailService: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'tenant-created-uuid',
            name: data.name,
            slug: data.slug,
            status: data.status,
            settings: data.settings,
          })
        ),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({
            id: where.id,
            name: data.name,
            settings: data.settings,
          })
        ),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'user-created-uuid',
            email: data.email,
            phoneNumber: data.phoneNumber,
            emailVerified: false,
          })
        ),
        update: jest.fn().mockResolvedValue({ id: 'user-created-uuid' }),
      },
      role: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'role-admin-uuid',
          name: SystemRole.CLIENT_ADMIN,
          permissions: [{ permission: { code: 'tenant:read' } }],
        }),
      },
      tenantMembership: {
        create: jest.fn().mockResolvedValue({ id: 'member-created-uuid' }),
      },
      emailVerificationToken: {
        create: jest.fn().mockResolvedValue({ id: 'token-uuid', tokenHash: 'dummy' }),
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
      sendVerificationEmail: jest.fn().mockResolvedValue({ success: true, provider: 'resend' }),
      getWebBaseUrl: jest.fn().mockReturnValue('https://kalpak-web.onrender.com'),
    };

    subdomainResolver = new SubdomainResolverService(mockPrisma as unknown as PrismaService);
    authService = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockAuditService as unknown as AuditService,
      mockMailService as unknown as MailService,
      subdomainResolver
    );
    tenantsService = new TenantsService(
      mockPrisma as unknown as PrismaService,
      mockAuditService as unknown as AuditService,
      mockMailService as unknown as MailService
    );
  });

  describe('1. Dynamic IANA Timezone Resolution & Validation', () => {
    it('should validate canonical IANA identifiers (Asia/Kolkata, America/New_York, Asia/Tokyo, Europe/London)', () => {
      expect(isValidIanaTimezone('Asia/Kolkata')).toBe(true);
      expect(isValidIanaTimezone('America/New_York')).toBe(true);
      expect(isValidIanaTimezone('Asia/Tokyo')).toBe(true);
      expect(isValidIanaTimezone('Europe/London')).toBe(true);
      expect(isValidIanaTimezone('UTC')).toBe(true);
      expect(isValidIanaTimezone('Asia/Singapore')).toBe(true);
      expect(isValidIanaTimezone('Australia/Sydney')).toBe(true);
    });

    it('should reject invalid or fabricated timezone strings', () => {
      expect(isValidIanaTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidIanaTimezone('Mars/Olympus')).toBe(false);
      expect(isValidIanaTimezone('GMT+5:30')).toBe(false); // Raw offset is not an IANA identifier
      expect(isValidIanaTimezone('')).toBe(false);
      expect(isValidIanaTimezone(null as any)).toBe(false);
    });

    it('should dynamically list 400+ IANA timezones with formatted UTC offsets and labels', () => {
      const list = getSupportedTimezones();
      expect(list.length).toBeGreaterThan(300);

      const kolkata = list.find((tz) => tz.value === 'Asia/Kolkata');
      expect(kolkata).toBeDefined();
      expect(kolkata?.offset).toBe('UTC+05:30');

      const tokyo = list.find((tz) => tz.value === 'Asia/Tokyo');
      expect(tokyo).toBeDefined();
      expect(tokyo?.offset).toBe('UTC+09:00');
    });

    it('should save Asia/Kolkata timezone during organization registration', async () => {
      const signupDto = {
        companyName: 'Bharat Precision Gears',
        slug: 'bharat-gears',
        fullName: 'Rajesh Sharma',
        email: 'rajesh@bharatgears.com',
        password: 'Password123!',
        timezone: 'Asia/Kolkata',
      };

      await authService.signup(signupDto as any);
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              timezone: 'Asia/Kolkata',
            }),
          }),
        })
      );
    });

    it('should save a different timezone (e.g. America/New_York or Asia/Tokyo) for another tenant', async () => {
      const signupDto = {
        companyName: 'Apex Hydraulics USA',
        slug: 'apex-hydraulics',
        fullName: 'John Miller',
        email: 'john@apexhydraulics.com',
        password: 'Password123!',
        timezone: 'America/New_York',
      };

      await authService.signup(signupDto as any);
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              timezone: 'America/New_York',
            }),
          }),
        })
      );
    });

    it('should keep timezone optional during registration and fallback to UTC if empty', async () => {
      const signupDto = {
        companyName: 'Global Turbines',
        slug: 'global-turbines',
        fullName: 'Sarah Connor',
        email: 'sarah@globalturbines.com',
        password: 'Password123!',
        // timezone omitted entirely
      };

      await authService.signup(signupDto as any);
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              timezone: 'UTC',
            }),
          }),
        })
      );
    });

    it('should REJECT registration when an invalid timezone string is sent to the API', async () => {
      const signupDto = {
        companyName: 'Faulty Timezone Corp',
        slug: 'faulty-timezone',
        fullName: 'Dan Smith',
        email: 'dan@faulty.com',
        password: 'Password123!',
        timezone: 'NotAnActual/Timezone_Name',
      };

      await expect(authService.signup(signupDto as any)).rejects.toThrow(BadRequestException);
      await expect(authService.signup(signupDto as any)).rejects.toThrow(
        'Invalid timezone identifier "NotAnActual/Timezone_Name"'
      );
    });
  });

  describe('2. International Phone Country Code & E.164 Normalization', () => {
    it('should list international countries with dial codes and flag emojis', () => {
      const countries = getSupportedCountries();
      expect(countries.length).toBeGreaterThan(200);

      const india = countries.find((c) => c.code === 'IN');
      expect(india).toBeDefined();
      expect(india?.dialCode).toBe('+91');
      expect(india?.flag).toBe('🇮🇳');

      const usa = countries.find((c) => c.code === 'US');
      expect(usa).toBeDefined();
      expect(usa?.dialCode).toBe('+1');
      expect(usa?.flag).toBe('🇺🇸');

      const japan = countries.find((c) => c.code === 'JP');
      expect(japan).toBeDefined();
      expect(japan?.dialCode).toBe('+81');
      expect(japan?.flag).toBe('🇯🇵');
    });

    it('should validate and normalize a valid Indian (+91) phone number to E.164', () => {
      const res1 = normalizePhoneNumber('+91 98765 43210', 'IN');
      expect(res1.isValid).toBe(true);
      expect(res1.e164).toBe('+919876543210');

      const res2 = normalizePhoneNumber('9876543210', 'IN');
      expect(res2.isValid).toBe(true);
      expect(res2.e164).toBe('+919876543210');
    });

    it('should validate and normalize other countries (US +1, UK +44, Japan +81, Singapore +65)', () => {
      // United States
      const usRes = normalizePhoneNumber('(202) 555-0123', 'US');
      expect(usRes.isValid).toBe(true);
      expect(usRes.e164).toBe('+12025550123');

      // United Kingdom
      const ukRes = normalizePhoneNumber('020 7946 0991', 'GB');
      expect(ukRes.isValid).toBe(true);
      expect(ukRes.e164).toBe('+442079460991');

      // Japan
      const jpRes = normalizePhoneNumber('03-1234-5678', 'JP');
      expect(jpRes.isValid).toBe(true);
      expect(jpRes.e164).toBe('+81312345678');

      // Singapore
      const sgRes = normalizePhoneNumber('6123 4567', 'SG');
      expect(sgRes.isValid).toBe(true);
      expect(sgRes.e164).toBe('+6561234567');
    });

    it('should correctly handle countries that share calling codes (+1 for US and Canada)', () => {
      const usNum = normalizePhoneNumber('202-555-0199', 'US');
      expect(usNum.isValid).toBe(true);
      expect(usNum.e164).toBe('+12025550199');
      expect(usNum.country).toBe('US');

      const caNum = normalizePhoneNumber('416-555-0199', 'CA');
      expect(caNum.isValid).toBe(true);
      expect(caNum.e164).toBe('+14165550199');
      expect(caNum.country).toBe('CA');
    });

    it('should reject invalid or malformed phone numbers', () => {
      const invalidShort = normalizePhoneNumber('12345', 'IN');
      expect(invalidShort.isValid).toBe(false);
      expect(invalidShort.error).toBeDefined();

      const invalidChars = normalizePhoneNumber('abc-not-a-number', 'US');
      expect(invalidChars.isValid).toBe(false);
    });

    it('should normalize and store E.164 phone during registration', async () => {
      const signupDto = {
        companyName: 'Tokyo Precision Robotics',
        slug: 'tokyo-robotics',
        fullName: 'Kenji Sato',
        email: 'kenji@tokyorobotics.jp',
        password: 'Password123!',
        phoneNumber: '+81 3-1234-5678',
        timezone: 'Asia/Tokyo',
      };

      await authService.signup(signupDto as any);
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              phoneNumber: '+81312345678',
            }),
          }),
        })
      );
    });

    it('should REJECT registration when a malformed phone number is sent directly to API', async () => {
      const signupDto = {
        companyName: 'Broken Phone Corp',
        slug: 'broken-phone',
        fullName: 'Alice',
        email: 'alice@broken.com',
        password: 'Password123!',
        phoneNumber: '000-invalid-1234',
      };

      await expect(authService.signup(signupDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Company Profile Editing & Cross-Tenant Protection', () => {
    it('should update timezone and normalize phone number when editing company settings', async () => {
      const tenantId = 'tenant-1111-1111';
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: tenantId,
        name: 'Initial Name',
        slug: 'initial-slug',
        status: TenantStatus.ACTIVE,
        deletedAt: null,
        settings: {
          timezone: 'UTC',
          phoneNumber: null,
        },
      });

      const updateDto = {
        name: 'Updated Company Name',
        timezone: 'Asia/Kolkata',
        phone: '+91 98765 43210',
      };

      const updated = await tenantsService.updateTenantProfile(tenantId, 'user-admin-1', updateDto);
      expect(mockPrisma.tenant.update).toHaveBeenCalled();
      const settings = updated.settings as any;
      expect(settings.companyProfile.timezone).toBe('Asia/Kolkata');
      expect(settings.companyProfile.phone).toBe('+919876543210');
      expect(settings.timezone).toBe('Asia/Kolkata');
      expect(settings.phoneNumber).toBe('+919876543210');
    });

    it('should reject editing company settings with an invalid timezone', async () => {
      const tenantId = 'tenant-1111-1111';
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: tenantId,
        name: 'Test Tenant',
        deletedAt: null,
        settings: {},
      });

      const updateDto = {
        timezone: 'Bogus/Invalid_Timezone',
      };

      await expect(
        tenantsService.updateTenantProfile(tenantId, 'user-admin-1', updateDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject editing company settings with a malformed phone number', async () => {
      const tenantId = 'tenant-1111-1111';
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: tenantId,
        name: 'Test Tenant',
        deletedAt: null,
        settings: {},
      });

      const updateDto = {
        phone: '12345',
      };

      await expect(
        tenantsService.updateTenantProfile(tenantId, 'user-admin-1', updateDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail with NotFoundException when attempting to update a non-existent or foreign tenant ID', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(
        tenantsService.updateTenantProfile('foreign-tenant-uuid', 'user-intruder', {
          timezone: 'Asia/Kolkata',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });
});
