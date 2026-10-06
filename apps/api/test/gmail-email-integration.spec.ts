import { GmailEmailProvider, ParsedGmailMessage } from '../src/modules/email-integration/providers/gmail.provider';
import { GmailSyncService } from '../src/modules/email-integration/gmail-sync.service';
import { EmailConnectionController } from '../src/modules/email-integration/email-connection.controller';
import { EmailConfigController } from '../src/modules/email-integration/email-config.controller';
import { TenantContextService } from '../src/core/tenant/tenant-context.service';
import { DepartmentRoutingService } from '../src/modules/email-integration/department-routing.service';
import { EmailConnectionStatus, TicketPriority } from '@kalpak/database';
import { TenantContext, SystemRole } from '@kalpak/types';
import { ConflictException } from '@nestjs/common';

describe('Gmail API & Google OAuth 2.0 Email-to-Ticket Test Suite', () => {
  let gmailProvider: GmailEmailProvider;
  let gmailSyncService: GmailSyncService;
  let connectionController: EmailConnectionController;
  let configController: EmailConfigController;
  let tenantContextService: TenantContextService;
  let routingService: DepartmentRoutingService;

  let mockPrisma: any;
  let mockTicketsService: any;
  let mockAuditService: any;

  const TENANT_A_ID = 'tenant-a-uuid-1111';
  const TENANT_B_ID = 'tenant-b-uuid-2222';
  const USER_A_ID = 'user-a-admin-uuid';

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret-xyz';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:4000/api/v1/email-integration/gmail/oauth/callback';
    process.env.SESSION_SECRET = 'test_session_secret_32_characters_long_min_!';

    gmailProvider = new GmailEmailProvider();
    tenantContextService = new TenantContextService();

    mockPrisma = {
      tenant: {
        findUnique: jest.fn(),
      },
      emailConnection: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      emailConfiguration: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      serviceTicket: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      emailMessage: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      department: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    mockTicketsService = {
      createTicket: jest.fn(),
      addNote: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockAuditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-log-uuid' }),
    };

    routingService = new DepartmentRoutingService(mockPrisma);

    gmailSyncService = new GmailSyncService(
      mockPrisma,
      tenantContextService,
      gmailProvider,
      mockTicketsService,
      routingService,
      mockAuditService
    );

    connectionController = new EmailConnectionController(
      mockPrisma,
      gmailProvider,
      gmailSyncService,
      mockAuditService
    );

    configController = new EmailConfigController(
      mockPrisma,
      mockAuditService
    );
  });

  afterEach(() => {
    gmailSyncService.onModuleDestroy();
  });

  // ============================================================================
  // 1. Google OAuth 2.0 URL Generation & Token Security
  // ============================================================================
  describe('Google OAuth 2.0 Security & Token Encryption', () => {
    it('should generate a valid Google OAuth URL with signed state token and required Gmail scopes', async () => {
      const tenantCtx: TenantContext = {
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
        roles: [SystemRole.CLIENT_ADMIN],
        permissions: [],
        isSuperAdmin: false,
      };

      const result = await connectionController.getConnectUrl(tenantCtx, {
        id: USER_A_ID,
        email: 'admin@companya.com',
        roles: [SystemRole.CLIENT_ADMIN],
        permissions: [],
      } as any);

      expect(result.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(result.authUrl).toContain('client_id=test-google-client-id');
      expect(result.authUrl).toContain('access_type=offline');
      expect(result.authUrl).toContain('prompt=consent');
      expect(result.authUrl).toContain('https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.modify');
      expect(result.authUrl).toContain('state=');
    });

    it('should encrypt and decrypt Google tokens using AES-256-GCM without exposing raw secrets', () => {
      const sampleTokens = {
        accessToken: 'ya29.sample_access_token_12345',
        refreshToken: '1//0g_sample_refresh_token_67890',
        expiryDate: Date.now() + 3600000,
        scope: 'gmail.modify gmail.send',
      };

      const encrypted = gmailSyncService.encryptTokens(sampleTokens);
      expect(encrypted).toMatch(/^enc:v1:/);
      expect(encrypted).not.toContain(sampleTokens.accessToken);
      expect(encrypted).not.toContain(sampleTokens.refreshToken);

      const decrypted = gmailSyncService.decryptTokens(encrypted);
      expect(decrypted.accessToken).toBe(sampleTokens.accessToken);
      expect(decrypted.refreshToken).toBe(sampleTokens.refreshToken);
      expect(decrypted.expiryDate).toBe(sampleTokens.expiryDate);
    });

    it('should sanitize connection status and never return access/refresh tokens to the frontend', async () => {
      const encryptedData = gmailSyncService.encryptTokens({
        accessToken: 'secret_access_token',
        refreshToken: 'secret_refresh_token',
        expiryDate: Date.now() + 3600000,
      });

      mockPrisma.emailConnection.findUnique.mockResolvedValue({
        id: 'conn-uuid',
        tenantId: TENANT_A_ID,
        provider: 'GMAIL',
        emailAddress: 'support.companya@gmail.com',
        encryptedTokenData: encryptedData,
        status: EmailConnectionStatus.CONNECTED,
        lastSyncAt: new Date('2026-10-05T10:00:00Z'),
      });

      const status = await connectionController.getStatus({
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
        roles: [SystemRole.CLIENT_ADMIN],
        permissions: [],
        isSuperAdmin: false,
      });

      expect(status.isConnected).toBe(true);
      expect(status.status).toBe(EmailConnectionStatus.CONNECTED);
      expect(status.emailAddress).toBe('support.companya@gmail.com');
      expect(status.provider).toBe('GMAIL');
      // Crucial security guarantee:
      expect((status as any).encryptedTokenData).toBeUndefined();
      expect((status as any).accessToken).toBeUndefined();
      expect((status as any).refreshToken).toBeUndefined();
    });
  });

  // ============================================================================
  // 2. Inbound Email Flow & Ticket Creation
  // ============================================================================
  describe('Inbound Email Flow & Ticket Creation', () => {
    it('should convert incoming customer email into a real ticket and dispatch acknowledgement', async () => {
      const encryptedData = gmailSyncService.encryptTokens({
        accessToken: 'mock_valid_access_token',
        refreshToken: 'mock_refresh_token',
        expiryDate: Date.now() + 3600000,
      });

      mockPrisma.emailConnection.findFirst.mockResolvedValue({
        id: 'conn-a',
        tenantId: TENANT_A_ID,
        provider: 'GMAIL',
        emailAddress: 'support.companya@gmail.com',
        encryptedTokenData: encryptedData,
        status: EmailConnectionStatus.CONNECTED,
      });

      mockPrisma.emailConfiguration.findUnique.mockResolvedValue({
        tenantId: TENANT_A_ID,
        enabled: true,
        autoCreateTicket: true,
        customerRepliesEnabled: true,
        unknownCustomerPolicy: 'AUTO_CREATE',
        defaultPriority: TicketPriority.MEDIUM,
        notifyTicketCreated: true,
      });

      // No duplicate exists
      mockPrisma.emailMessage.findFirst.mockResolvedValue(null);

      // Customer does not exist yet (auto-provisioning test)
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({
        id: 'cust-rahul-uuid',
        tenantId: TENANT_A_ID,
        contactPerson: 'Rahul Sharma',
        email: 'rahul@gmail.com',
      });

      // Mock ticket creation
      mockTicketsService.createTicket.mockResolvedValue({
        id: 'ticket-10001',
        ticketNumber: 'KAL-2026-0001',
        title: 'Laptop WiFi not working',
        priority: 'MEDIUM',
        status: 'OPEN',
      });

      // Mock Gmail API fetch and send
      const mockEmail: ParsedGmailMessage = {
        providerMessageId: 'gmail-msg-001',
        messageId: '<cabb-123@mail.gmail.com>',
        fromEmail: 'rahul@gmail.com',
        fromName: 'Rahul Sharma',
        toEmail: 'support.companya@gmail.com',
        subject: 'Laptop WiFi not working',
        bodyText: 'My laptop cannot connect to the office WiFi.',
        receivedAt: new Date(),
        rawPayload: {},
      };

      jest.spyOn(gmailProvider, 'fetchNewMessages').mockResolvedValue([mockEmail]);
      const sendEmailSpy = jest.spyOn(gmailProvider, 'sendEmail').mockResolvedValue({
        messageId: '<kalpak-ack-001@companya.com>',
        providerMessageId: 'gmail-sent-001',
      });

      const syncResult = await gmailSyncService.syncTenantMailbox(TENANT_A_ID);

      expect(syncResult.syncedCount).toBe(1);
      expect(syncResult.errors).toHaveLength(0);

      // Verify customer was provisioned
      expect(mockPrisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A_ID,
            email: 'rahul@gmail.com',
          }),
        })
      );

      // Verify ticket was created with source EMAIL
      expect(mockTicketsService.createTicket).toHaveBeenCalledWith(
        TENANT_A_ID,
        null,
        expect.objectContaining({
          title: 'Laptop WiFi not working',
          description: 'My laptop cannot connect to the office WiFi.',
          source: 'EMAIL',
          raisedBy: 'CUSTOMER',
          raisedForCustomerId: 'cust-rahul-uuid',
        })
      );

      // Verify real acknowledgement email was sent via Gmail API
      expect(sendEmailSpy).toHaveBeenCalledWith(
        'mock_valid_access_token',
        'support.companya@gmail.com',
        expect.objectContaining({
          to: 'rahul@gmail.com',
          subject: expect.stringContaining('KAL-2026-0001'),
          inReplyTo: '<cabb-123@mail.gmail.com>',
        })
      );

      // Verify inbound and outbound EmailMessage records were persisted
      expect(mockPrisma.emailMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A_ID,
            ticketId: 'ticket-10001',
            provider: 'GMAIL',
            providerMessageId: 'gmail-msg-001',
            direction: 'INBOUND',
          }),
        })
      );
      expect(mockPrisma.emailMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A_ID,
            ticketId: 'ticket-10001',
            provider: 'GMAIL',
            direction: 'OUTBOUND',
          }),
        })
      );
    });
  });

  // ============================================================================
  // 3. Customer Reply Matching & Duplicate Prevention
  // ============================================================================
  describe('Customer Reply Matching (Threading) & Duplicate Prevention', () => {
    it('should append a customer reply to the existing ticket when ticket number is in Subject and NOT create a new ticket', async () => {
      const encryptedData = gmailSyncService.encryptTokens({
        accessToken: 'mock_token',
        expiryDate: Date.now() + 3600000,
      });

      mockPrisma.emailConnection.findFirst.mockResolvedValue({
        id: 'conn-a',
        tenantId: TENANT_A_ID,
        emailAddress: 'support.companya@gmail.com',
        encryptedTokenData: encryptedData,
        status: EmailConnectionStatus.CONNECTED,
      });

      mockPrisma.emailConfiguration.findUnique.mockResolvedValue({
        tenantId: TENANT_A_ID,
        enabled: true,
        autoCreateTicket: true,
        customerRepliesEnabled: true,
      });

      // No duplicate message
      mockPrisma.emailMessage.findFirst.mockResolvedValue(null);

      // Existing customer
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-rahul',
        tenantId: TENANT_A_ID,
        email: 'rahul@gmail.com',
      });

      // Existing ticket
      mockPrisma.serviceTicket.findFirst.mockResolvedValue({
        id: 'ticket-10001',
        ticketNumber: 'KAL-2026-0001',
        title: 'Laptop WiFi not working',
        status: 'AWAITING_CUSTOMER',
      });

      const replyEmail: ParsedGmailMessage = {
        providerMessageId: 'gmail-reply-msg-002',
        messageId: '<reply-123@mail.gmail.com>',
        fromEmail: 'rahul@gmail.com',
        toEmail: 'support.companya@gmail.com',
        subject: 'Re: [KAL-2026-0001] Service Request Acknowledged: Laptop WiFi not working',
        bodyText: 'I restarted the router and the problem is resolved, thank you!',
        inReplyTo: '<cabb-123@mail.gmail.com>',
        receivedAt: new Date(),
        rawPayload: {},
      };

      jest.spyOn(gmailProvider, 'fetchNewMessages').mockResolvedValue([replyEmail]);

      const result = await gmailSyncService.syncTenantMailbox(TENANT_A_ID);

      expect(result.syncedCount).toBe(1);

      // Critical requirement: MUST NOT create a new ticket
      expect(mockTicketsService.createTicket).not.toHaveBeenCalled();

      // Must append note to existing ticket
      expect(mockTicketsService.addNote).toHaveBeenCalledWith(
        TENANT_A_ID,
        'ticket-10001',
        null,
        expect.objectContaining({
          note: expect.stringContaining('I restarted the router'),
        })
      );

      // Automatically restored status from AWAITING_CUSTOMER to IN_PROGRESS
      expect(mockTicketsService.updateStatus).toHaveBeenCalledWith(
        TENANT_A_ID,
        'ticket-10001',
        '',
        expect.objectContaining({
          status: 'IN_PROGRESS',
        })
      );

      // EmailMessage recorded against the existing ticket
      expect(mockPrisma.emailMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A_ID,
            ticketId: 'ticket-10001',
            direction: 'INBOUND',
            providerMessageId: 'gmail-reply-msg-002',
          }),
        })
      );
    });

    it('should match reply via In-Reply-To header when subject does not contain ticket number', async () => {
      const encryptedData = gmailSyncService.encryptTokens({
        accessToken: 'mock_token',
        expiryDate: Date.now() + 3600000,
      });

      mockPrisma.emailConnection.findFirst.mockResolvedValue({
        id: 'conn-a',
        tenantId: TENANT_A_ID,
        emailAddress: 'support.companya@gmail.com',
        encryptedTokenData: encryptedData,
        status: EmailConnectionStatus.CONNECTED,
      });

      mockPrisma.emailConfiguration.findUnique.mockResolvedValue({
        tenantId: TENANT_A_ID,
        enabled: true,
        autoCreateTicket: true,
        customerRepliesEnabled: true,
      });

      // No duplicate
      mockPrisma.emailMessage.findFirst
        .mockResolvedValueOnce(null) // Duplicate check
        .mockResolvedValueOnce({ ticketId: 'ticket-10001' }); // In-Reply-To match

      mockPrisma.serviceTicket.findFirst.mockResolvedValue({
        id: 'ticket-10001',
        ticketNumber: 'KAL-2026-0001',
        status: 'IN_PROGRESS',
      });

      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-rahul',
        tenantId: TENANT_A_ID,
        email: 'rahul@gmail.com',
      });

      const replyWithoutNumberInSubject: ParsedGmailMessage = {
        providerMessageId: 'gmail-reply-header-003',
        messageId: '<reply-header-123@mail.gmail.com>',
        fromEmail: 'rahul@gmail.com',
        toEmail: 'support.companya@gmail.com',
        subject: 'Quick question about my laptop', // No ticket number in subject!
        bodyText: 'Do I need to bring the charger as well?',
        inReplyTo: '<original-message-id-999@companya.com>',
        receivedAt: new Date(),
        rawPayload: {},
      };

      jest.spyOn(gmailProvider, 'fetchNewMessages').mockResolvedValue([replyWithoutNumberInSubject]);

      const result = await gmailSyncService.syncTenantMailbox(TENANT_A_ID);

      expect(result.syncedCount).toBe(1);
      expect(mockTicketsService.createTicket).not.toHaveBeenCalled();
      expect(mockTicketsService.addNote).toHaveBeenCalledWith(
        TENANT_A_ID,
        'ticket-10001',
        null,
        expect.objectContaining({
          note: expect.stringContaining('Do I need to bring the charger as well?'),
        })
      );
    });

    it('should ignore duplicate emails idempotently without creating multiple tickets', async () => {
      const encryptedData = gmailSyncService.encryptTokens({
        accessToken: 'mock_token',
        expiryDate: Date.now() + 3600000,
      });

      mockPrisma.emailConnection.findFirst.mockResolvedValue({
        id: 'conn-a',
        tenantId: TENANT_A_ID,
        emailAddress: 'support.companya@gmail.com',
        encryptedTokenData: encryptedData,
        status: EmailConnectionStatus.CONNECTED,
      });

      mockPrisma.emailConfiguration.findUnique.mockResolvedValue({
        tenantId: TENANT_A_ID,
        enabled: true,
        autoCreateTicket: true,
      });

      // Existing email message in database for this providerMessageId!
      mockPrisma.emailMessage.findFirst.mockResolvedValue({
        id: 'existing-msg-uuid',
        tenantId: TENANT_A_ID,
        providerMessageId: 'duplicate-provider-msg-id',
      });

      const duplicateEmail: ParsedGmailMessage = {
        providerMessageId: 'duplicate-provider-msg-id',
        messageId: '<dup@mail.gmail.com>',
        fromEmail: 'rahul@gmail.com',
        toEmail: 'support.companya@gmail.com',
        subject: 'Duplicate check email',
        bodyText: 'Content',
        receivedAt: new Date(),
        rawPayload: {},
      };

      jest.spyOn(gmailProvider, 'fetchNewMessages').mockResolvedValue([duplicateEmail]);

      const result = await gmailSyncService.syncTenantMailbox(TENANT_A_ID);

      expect(result.syncedCount).toBe(0);
      expect(mockTicketsService.createTicket).not.toHaveBeenCalled();
      expect(mockTicketsService.addNote).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 4. Strict Multi-Tenancy & Authorization
  // ============================================================================
  describe('Strict Multi-Tenant Isolation & Authorization', () => {
    it('should prevent Client Admin A from claiming an email address already registered by Tenant B', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_A_ID,
        name: 'Company A',
      });

      // Duplicate check finds Tenant B already configured this email
      mockPrisma.emailConfiguration.findFirst.mockResolvedValue({
        id: 'config-b-id',
        tenantId: TENANT_B_ID,
        supportEmail: 'support@shared-domain.com',
      });

      const tenantACtx: TenantContext = {
        tenantId: TENANT_A_ID,
        userId: USER_A_ID,
        roles: [SystemRole.CLIENT_ADMIN],
        permissions: [],
        isSuperAdmin: false,
      };

      await expect(
        configController.updateEmailConfiguration(tenantACtx, { id: USER_A_ID } as any, {
          supportEmail: 'support@shared-domain.com',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should never cross-pollinate emails from Tenant A to Tenant B', async () => {
      const encryptedData = gmailSyncService.encryptTokens({
        accessToken: 'mock_token',
        expiryDate: Date.now() + 3600000,
      });

      mockPrisma.emailConnection.findFirst.mockResolvedValue({
        id: 'conn-a',
        tenantId: TENANT_A_ID,
        emailAddress: 'support.companya@gmail.com',
        encryptedTokenData: encryptedData,
        status: EmailConnectionStatus.CONNECTED,
      });

      mockPrisma.emailConfiguration.findUnique.mockResolvedValue({
        tenantId: TENANT_A_ID,
        enabled: true,
        autoCreateTicket: true,
      });

      mockPrisma.emailMessage.findFirst.mockResolvedValue(null);

      // Verify customer search is scoped to TENANT_A_ID only
      mockPrisma.customer.findFirst.mockImplementation(({ where }: any) => {
        expect(where.tenantId).toBe(TENANT_A_ID);
        return null;
      });

      mockPrisma.customer.create.mockResolvedValue({
        id: 'cust-a-1',
        tenantId: TENANT_A_ID,
        email: 'user@client.com',
      });

      mockTicketsService.createTicket.mockResolvedValue({
        id: 'ticket-a-1',
        ticketNumber: 'KAL-2026-0099',
        title: 'Issue',
      });

      jest.spyOn(gmailProvider, 'fetchNewMessages').mockResolvedValue([
        {
          providerMessageId: 'msg-tenant-a-only',
          messageId: '<msg-tenant-a@mail.com>',
          fromEmail: 'user@client.com',
          toEmail: 'support.companya@gmail.com',
          subject: 'Tenant A isolated support request',
          bodyText: 'Help me with machine in company A',
          receivedAt: new Date(),
          rawPayload: {},
        },
      ]);

      await gmailSyncService.syncTenantMailbox(TENANT_A_ID);

      // Verify ticket was strictly created under TENANT_A_ID
      expect(mockTicketsService.createTicket).toHaveBeenCalledWith(
        TENANT_A_ID,
        null,
        expect.anything()
      );
      expect(mockTicketsService.createTicket).not.toHaveBeenCalledWith(
        TENANT_B_ID,
        expect.anything(),
        expect.anything()
      );
    });
  });
});
