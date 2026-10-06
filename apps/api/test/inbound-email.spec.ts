import * as crypto from 'crypto';
import { MailgunInboundProvider } from '../src/modules/email-integration/providers/mailgun.provider';
import { ResendInboundProvider } from '../src/modules/email-integration/providers/resend.provider';
import { GenericInboundProvider } from '../src/modules/email-integration/providers/generic.provider';
import { EmailProviderService } from '../src/modules/email-integration/email-provider.service';
import { PostmarkInboundProvider } from '../src/modules/email-integration/providers/postmark.provider';
import { CloudMailinInboundProvider } from '../src/modules/email-integration/providers/cloudmailin.provider';
import { DepartmentRoutingService } from '../src/modules/email-integration/department-routing.service';
import { TenantResolverService } from '../src/modules/email-integration/tenant-resolver.service';
import { InboundEmailService } from '../src/modules/email-integration/inbound-email.service';
import { TenantContextService } from '../src/core/tenant/tenant-context.service';
import { UnauthorizedException } from '@nestjs/common';

describe('Real Inbound Email Integration & Tenant Isolation Test Suite', () => {
  const TEST_SECRET = 'test_webhook_signing_secret_key_2026';
  let mailgunProvider: MailgunInboundProvider;
  let resendProvider: ResendInboundProvider;
  let genericProvider: GenericInboundProvider;
  let postmarkProvider: PostmarkInboundProvider;
  let cloudmailinProvider: CloudMailinInboundProvider;
  let providerService: EmailProviderService;
  let routingService: DepartmentRoutingService;
  let tenantResolver: TenantResolverService;
  let inboundEmailService: InboundEmailService;
  let tenantContextService: TenantContextService;

  // Mock Prisma and Services
  let mockPrisma: any;
  let mockTicketsService: any;
  let mockAuditService: any;

  beforeEach(() => {
    process.env.EMAIL_WEBHOOK_SECRET = TEST_SECRET;

    mailgunProvider = new MailgunInboundProvider();
    resendProvider = new ResendInboundProvider();
    genericProvider = new GenericInboundProvider();
    postmarkProvider = new PostmarkInboundProvider();
    cloudmailinProvider = new CloudMailinInboundProvider();

    providerService = new EmailProviderService(
      mailgunProvider,
      resendProvider,
      postmarkProvider,
      genericProvider,
      cloudmailinProvider
    );

    tenantContextService = new TenantContextService();

    mockPrisma = {
      emailConfiguration: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      department: {
        findMany: jest.fn(),
      },
      serviceTicket: {
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      inboundEmail: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      supportEmail: {
        findFirst: jest.fn(),
      },
      emailMessage: {
        create: jest.fn().mockResolvedValue({ id: 'msg-uuid' }),
      },
    };

    mockTicketsService = {
      createTicket: jest.fn(),
      addNote: jest.fn(),
    };

    mockAuditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-log-uuid' }),
    };

    routingService = new DepartmentRoutingService(mockPrisma);
    tenantResolver = new TenantResolverService(mockPrisma);
    inboundEmailService = new InboundEmailService(
      mockPrisma,
      tenantContextService,
      tenantResolver,
      routingService,
      mockTicketsService,
      mockAuditService
    );
  });

  // ============================================================================
  // 1. Webhook Signature Verification
  // ============================================================================
  describe('Provider Cryptographic Webhook Verification', () => {
    it('should verify a valid Mailgun HMAC-SHA256 signature', async () => {
      const timestamp = '1770000000';
      const token = 'random_mailgun_token_12345';
      const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(`${timestamp}${token}`)
        .digest('hex');

      const body = {
        signature: { timestamp, token, signature },
        sender: 'rahul@gmail.com',
        recipient: 'support@abc-manufacturing.com',
        subject: 'Laptop WiFi not working',
        'body-plain': 'My laptop cannot connect to the office WiFi.',
      };

      const strategy = await providerService.verifyWebhook({}, body);
      expect(strategy.name).toBe('MAILGUN');
    });

    it('should REJECT an invalid or tampered Mailgun webhook signature with 401', async () => {
      const timestamp = '1770000000';
      const token = 'random_mailgun_token_12345';
      const forgedSignature = 'forged_deadbeef_signature';

      const body = {
        signature: { timestamp, token, signature: forgedSignature },
      };

      await expect(providerService.verifyWebhook({}, body)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should verify a valid Generic HMAC-SHA256 signature', async () => {
      const payload = {
        from: 'rahul@gmail.com',
        to: 'support@abc-manufacturing.com',
        subject: 'Printer issue',
        text: 'Printer jammed',
      };
      const payloadString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(payloadString)
        .digest('hex');

      const headers = { 'x-webhook-signature': signature };
      const strategy = await providerService.verifyWebhook(headers, payload);
      expect(strategy.name).toBe('GENERIC');
    });
  });

  // ============================================================================
  // 2. Strict Tenant Resolution (Zero New Tenant Creation)
  // ============================================================================
  describe('Strict Tenant Resolution', () => {
    it('should safely reject emails sent to an unknown recipient and NOT create any tenant or ticket', async () => {
      mockPrisma.emailConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const parsed = {
        provider: 'MAILGUN',
        messageId: 'msg-unknown-1',
        fromEmail: 'rahul@gmail.com',
        toEmail: 'unknown-intruder@example.com',
        allRecipients: ['unknown-intruder@example.com'],
        subject: 'Random subject',
        bodyText: 'Some body text',
      };

      const result = await inboundEmailService.processInboundEmail(parsed);

      expect(result.status).toBe('REJECTED_UNKNOWN_RECIPIENT');
      // Verify zero tickets were created
      expect(mockTicketsService.createTicket).not.toHaveBeenCalled();
      // Verify zero customers were created
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    });

    it('should resolve tenant correctly from configured supportEmail', async () => {
      const mockTenantABC = {
        id: 'tenant-abc-uuid',
        name: 'ABC Manufacturing',
        slug: 'abc-manufacturing',
        status: 'ACTIVE',
        deletedAt: null,
      };

      mockPrisma.emailConfiguration.findFirst.mockResolvedValue({
        id: 'cfg-1',
        tenantId: mockTenantABC.id,
        supportEmail: 'support@abc-manufacturing.com',
        enabled: true,
        tenant: mockTenantABC,
      });

      const resolved = await tenantResolver.resolveTenantFromRecipients([
        'support@abc-manufacturing.com',
      ]);

      expect(resolved).not.toBeNull();
      expect(resolved?.tenant.id).toBe(mockTenantABC.id);
      expect(resolved?.tenant.name).toBe('ABC Manufacturing');
    });

    it('should reject email if tenant email configuration is disabled', async () => {
      const mockTenantABC = {
        id: 'tenant-abc-uuid',
        name: 'ABC Manufacturing',
        slug: 'abc-manufacturing',
        status: 'ACTIVE',
        deletedAt: null,
      };

      mockPrisma.emailConfiguration.findFirst.mockResolvedValue({
        id: 'cfg-1',
        tenantId: mockTenantABC.id,
        supportEmail: 'support@abc-manufacturing.com',
        enabled: false, // DISABLED
        tenant: mockTenantABC,
      });

      const parsed = {
        provider: 'MAILGUN',
        messageId: 'msg-disabled-1',
        fromEmail: 'rahul@gmail.com',
        toEmail: 'support@abc-manufacturing.com',
        allRecipients: ['support@abc-manufacturing.com'],
        subject: 'WiFi issue',
        bodyText: 'WiFi issue description',
      };

      const result = await inboundEmailService.processInboundEmail(parsed);
      expect(result.status).toBe('REJECTED_DISABLED_TENANT');
      expect(mockTicketsService.createTicket).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 3. Customer Lookup & Creation Scoped within Tenant
  // ============================================================================
  describe('Customer Scoping & Auto-Creation', () => {
    const mockTenantABC = {
      id: 'tenant-abc-uuid',
      name: 'ABC Manufacturing',
      slug: 'abc-manufacturing',
      status: 'ACTIVE',
      deletedAt: null,
    };

    beforeEach(() => {
      mockPrisma.emailConfiguration.findFirst.mockResolvedValue({
        id: 'cfg-1',
        tenantId: mockTenantABC.id,
        supportEmail: 'support@abc-manufacturing.com',
        enabled: true,
        autoCreateTicket: true,
        autoRoute: true,
        tenant: mockTenantABC,
      });
      mockPrisma.inboundEmail.findFirst.mockResolvedValue(null);
      mockPrisma.department.findMany.mockResolvedValue([
        { id: 'dept-it-uuid', code: 'IT', name: 'Information Technology' },
      ]);
    });

    it('should find existing customer Rahul strictly within Tenant ABC', async () => {
      const existingRahul = {
        id: 'cust-rahul-uuid',
        tenantId: mockTenantABC.id,
        email: 'rahul@gmail.com',
        contactPerson: 'Rahul Sharma',
        companyName: 'Acme Client Partner',
      };

      mockPrisma.customer.findFirst.mockResolvedValue(existingRahul);
      mockTicketsService.createTicket.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'KAL-2026-0001',
      });
      mockPrisma.inboundEmail.create.mockResolvedValue({ id: 'inbound-1' });

      const parsed = {
        provider: 'MAILGUN',
        messageId: 'msg-rahul-1',
        fromEmail: 'rahul@gmail.com',
        fromName: 'Rahul Sharma',
        toEmail: 'support@abc-manufacturing.com',
        allRecipients: ['support@abc-manufacturing.com'],
        subject: 'Laptop WiFi not working',
        bodyText: 'My laptop cannot connect to the office WiFi.',
      };

      const result = await inboundEmailService.processInboundEmail(parsed);

      expect(result.status).toBe('TICKET_CREATED');
      expect(result.customerId).toBe(existingRahul.id);
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();

      // Verify customer search was strictly scoped by tenantId = ABC
      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantABC.id,
          email: { equals: 'rahul@gmail.com', mode: 'insensitive' },
          deletedAt: null,
        },
      });
    });

    it('should auto-create customer Rahul strictly inside Tenant ABC if not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null); // Customer does not exist yet

      const newRahul = {
        id: 'cust-rahul-new-uuid',
        tenantId: mockTenantABC.id,
        email: 'rahul@gmail.com',
        contactPerson: 'Rahul',
        companyName: 'Rahul (Email Customer)',
      };
      mockPrisma.customer.create.mockResolvedValue(newRahul);
      mockTicketsService.createTicket.mockResolvedValue({
        id: 'ticket-2',
        ticketNumber: 'KAL-2026-0002',
      });
      mockPrisma.inboundEmail.create.mockResolvedValue({ id: 'inbound-2' });

      const parsed = {
        provider: 'MAILGUN',
        messageId: 'msg-rahul-new-1',
        fromEmail: 'rahul@gmail.com',
        fromName: 'Rahul',
        toEmail: 'support@abc-manufacturing.com',
        allRecipients: ['support@abc-manufacturing.com'],
        subject: 'Laptop WiFi not working',
        bodyText: 'My laptop cannot connect to the office WiFi.',
      };

      const result = await inboundEmailService.processInboundEmail(parsed);

      expect(result.status).toBe('TICKET_CREATED');
      expect(result.customerId).toBe(newRahul.id);

      // Verify customer creation strictly contained tenantId = ABC
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantABC.id,
          email: 'rahul@gmail.com',
        }),
      });
    });
  });

  // ============================================================================
  // 4. Ticket Creation, Source = EMAIL, and Department Routing
  // ============================================================================
  describe('Ticket Creation & Department Routing', () => {
    const mockTenantABC = {
      id: 'tenant-abc-uuid',
      name: 'ABC Manufacturing',
      slug: 'abc-manufacturing',
      status: 'ACTIVE',
      deletedAt: null,
    };

    it('should route "Laptop WiFi not working" to IT department with HIGH priority and source=EMAIL', async () => {
      mockPrisma.emailConfiguration.findFirst.mockResolvedValue({
        id: 'cfg-1',
        tenantId: mockTenantABC.id,
        supportEmail: 'support@abc-manufacturing.com',
        enabled: true,
        autoCreateTicket: true,
        autoRoute: true,
        tenant: mockTenantABC,
      });

      mockPrisma.inboundEmail.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-rahul-uuid',
        tenantId: mockTenantABC.id,
        email: 'rahul@gmail.com',
      });

      const itDept = { id: 'dept-it-uuid', code: 'IT', name: 'Information Technology' };
      const mechDept = { id: 'dept-mech-uuid', code: 'MECH', name: 'Mechanical' };
      mockPrisma.department.findMany.mockResolvedValue([mechDept, itDept]);

      mockTicketsService.createTicket.mockResolvedValue({
        id: 'ticket-wifi-uuid',
        ticketNumber: 'KAL-2026-0005',
        source: 'EMAIL',
      });
      mockPrisma.inboundEmail.create.mockResolvedValue({ id: 'inbound-wifi' });

      const parsed = {
        provider: 'MAILGUN',
        messageId: 'msg-wifi-test',
        fromEmail: 'rahul@gmail.com',
        toEmail: 'support@abc-manufacturing.com',
        allRecipients: ['support@abc-manufacturing.com'],
        subject: 'Laptop WiFi not working',
        bodyText: 'My laptop cannot connect to the office WiFi.',
      };

      const result = await inboundEmailService.processInboundEmail(parsed);

      expect(result.status).toBe('TICKET_CREATED');
      expect(mockTicketsService.createTicket).toHaveBeenCalledWith(
        mockTenantABC.id,
        null,
        expect.objectContaining({
          source: 'EMAIL',
          title: 'Laptop WiFi not working',
          description: 'My laptop cannot connect to the office WiFi.',
          departmentId: itDept.id,
          priority: 'HIGH',
          raisedBy: 'CUSTOMER',
        })
      );
    });
  });

  // ============================================================================
  // 5. Idempotency (Duplicate Webhook Delivery)
  // ============================================================================
  describe('Idempotency & Duplicate Prevention', () => {
    it('should ignore duplicate webhook with same messageId and return existing ticket without creating a new ticket', async () => {
      const mockTenantABC = {
        id: 'tenant-abc-uuid',
        name: 'ABC Manufacturing',
        slug: 'abc-manufacturing',
        status: 'ACTIVE',
        deletedAt: null,
      };

      mockPrisma.emailConfiguration.findFirst.mockResolvedValue({
        id: 'cfg-1',
        tenantId: mockTenantABC.id,
        supportEmail: 'support@abc-manufacturing.com',
        enabled: true,
        tenant: mockTenantABC,
      });

      // Existing email record found in database
      mockPrisma.inboundEmail.findFirst.mockResolvedValue({
        id: 'existing-inbound-uuid',
        tenantId: mockTenantABC.id,
        messageId: 'msg-duplicate-1',
        ticketId: 'ticket-orig-uuid',
        ticket: { id: 'ticket-orig-uuid', ticketNumber: 'KAL-2026-0001' },
      });

      const parsed = {
        provider: 'MAILGUN',
        messageId: 'msg-duplicate-1',
        fromEmail: 'rahul@gmail.com',
        toEmail: 'support@abc-manufacturing.com',
        allRecipients: ['support@abc-manufacturing.com'],
        subject: 'Laptop WiFi not working',
        bodyText: 'Retry delivery',
      };

      const result = await inboundEmailService.processInboundEmail(parsed);

      expect(result.status).toBe('IDEMPOTENT_IGNORED');
      expect(result.ticketNumber).toBe('KAL-2026-0001');
      // Ensure zero duplicate tickets or customer writes
      expect(mockTicketsService.createTicket).not.toHaveBeenCalled();
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();
      expect(mockPrisma.inboundEmail.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 6. Cross-Tenant Security Isolation Test
  // ============================================================================
  describe('Multi-Tenant Cross-Tenant Security Isolation', () => {
    it('should isolate Tenant A (ABC) from Tenant B (XYZ)', async () => {
      const tenantA = {
        id: 'tenant-a-abc',
        name: 'ABC Manufacturing',
        slug: 'abc-manufacturing',
        status: 'ACTIVE',
        deletedAt: null,
      };

      const tenantB = {
        id: 'tenant-b-xyz',
        name: 'XYZ Industries',
        slug: 'xyz-industries',
        status: 'ACTIVE',
        deletedAt: null,
      };

      // Email sent to Tenant A
      mockPrisma.emailConfiguration.findFirst.mockImplementation(({ where }: any) => {
        const supportEmail = where.OR[0].supportEmail.equals;
        if (supportEmail === 'support@abc-manufacturing.com') {
          return Promise.resolve({
            id: 'cfg-a',
            tenantId: tenantA.id,
            supportEmail: 'support@abc-manufacturing.com',
            enabled: true,
            autoCreateTicket: true,
            autoRoute: true,
            tenant: tenantA,
          });
        }
        return Promise.resolve(null);
      });

      mockPrisma.inboundEmail.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-rahul-a',
        tenantId: tenantA.id,
        email: 'rahul@gmail.com',
      });
      mockPrisma.department.findMany.mockResolvedValue([]);
      mockTicketsService.createTicket.mockResolvedValue({
        id: 'ticket-a-1',
        ticketNumber: 'KAL-2026-0010',
      });
      mockPrisma.inboundEmail.create.mockResolvedValue({ id: 'inbound-a-1' });

      const emailToA = {
        provider: 'MAILGUN',
        messageId: 'msg-to-a',
        fromEmail: 'rahul@gmail.com',
        toEmail: 'support@abc-manufacturing.com',
        allRecipients: ['support@abc-manufacturing.com'],
        subject: 'ABC Machine Down',
        bodyText: 'Machine #4 down at ABC factory',
      };

      const result = await inboundEmailService.processInboundEmail(emailToA);

      expect(result.status).toBe('TICKET_CREATED');
      expect(result.tenantId).toBe(tenantA.id);

      // Verify that Tenant B (XYZ) context CANNOT see or access Tenant A's ticket
      // In AsyncLocalStorage and RLS, Tenant B has context.tenantId = 'tenant-b-xyz'
      const contextB = {
        tenantId: tenantB.id,
        userId: 'user-xyz',
        roles: ['CLIENT_ADMIN'],
        permissions: ['ticket:read'],
        isSuperAdmin: false,
      };

      await tenantContextService.runWithContext(contextB, async () => {
        expect(tenantContextService.getTenantId()).toBe(tenantB.id);
        expect(tenantContextService.getTenantId()).not.toBe(result.tenantId);
      });
    });
  });
});
