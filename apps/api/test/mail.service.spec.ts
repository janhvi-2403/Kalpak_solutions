import { MailService } from '../src/core/mail/mail.service';
import { Resend } from 'resend';

jest.mock('resend');

describe('MailService with Resend Integration', () => {
  let mailService: MailService;
  let mockResendSend: jest.Mock;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    mockResendSend = jest.fn();
    (Resend as unknown as jest.Mock).mockImplementation(() => ({
      emails: {
        send: mockResendSend,
      },
    }));

    mailService = new MailService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Resend Initialization and Configuration', () => {
    it('should initialize Resend client using server-side RESEND_API_KEY', () => {
      process.env.RESEND_API_KEY = 're_test_key_12345';
      mailService.onModuleInit();

      expect(Resend).toHaveBeenCalledWith('re_test_key_12345');
    });

    it('should use EMAIL_FROM when provided in environment', () => {
      process.env.RESEND_API_KEY = 're_test_key_12345';
      process.env.EMAIL_FROM = 'Kalpak Support <notifications@kalpak.solutions>';
      mailService.onModuleInit();

      const fromAddress = mailService.getFromAddress();
      expect(fromAddress).toBe('Kalpak Support <notifications@kalpak.solutions>');
    });

    it('should fall back to authorized Resend onboarding domain when EMAIL_FROM is not explicitly set', () => {
      process.env.RESEND_API_KEY = 're_test_key_12345';
      delete process.env.EMAIL_FROM;
      mailService.onModuleInit();

      const fromAddress = mailService.getFromAddress();
      expect(fromAddress).toBe('Kalpak Solutions <onboarding@resend.dev>');
    });
  });

  describe('2. Successful Email Dispatch via Resend', () => {
    it('should send email using Resend SDK and return success true with messageId', async () => {
      process.env.RESEND_API_KEY = 're_test_key_12345';
      mailService.onModuleInit();

      mockResendSend.mockResolvedValueOnce({
        data: { id: 'resend_msg_abc123' },
        error: null,
      });

      const result = await mailService.sendEmail({
        to: 'user@example.com',
        subject: 'Verify Your Email',
        text: 'Please verify your email address.',
        html: '<p>Please verify your email address.</p>',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('resend');
      expect(result.messageId).toBe('resend_msg_abc123');
      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'Kalpak Solutions <onboarding@resend.dev>',
        to: ['user@example.com'],
        subject: 'Verify Your Email',
        text: 'Please verify your email address.',
        html: '<p>Please verify your email address.</p>',
        replyTo: undefined,
      });
    });
  });

  describe('3. Error Handling and Provider Failures', () => {
    it('should handle Resend API error response safely and report failure without throwing', async () => {
      process.env.RESEND_API_KEY = 're_test_key_12345';
      mailService.onModuleInit();

      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: {
          name: 'validation_error',
          message: 'The domain kalpak.solutions is not verified. Please verify your domain.',
        },
      });

      const result = await mailService.sendEmail({
        to: 'user@example.com',
        subject: 'Welcome',
        text: 'Welcome to Kalpak',
        html: '<p>Welcome</p>',
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('resend');
      expect(result.error).toContain('is not verified');
    });

    it('should handle unexpected network/SDK exceptions gracefully without crashing', async () => {
      process.env.RESEND_API_KEY = 're_test_key_12345';
      mailService.onModuleInit();

      mockResendSend.mockRejectedValueOnce(new Error('Network timeout connecting to api.resend.com'));

      const result = await mailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        text: 'Test Text',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('resend');
      expect(result.error).toBe('Network timeout connecting to api.resend.com');
    });

    it('should return failure when neither Resend nor SMTP is configured without crashing', async () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.SMTP_HOST;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.GMAIL_USER;

      const unconfiguredService = new MailService();
      unconfiguredService.onModuleInit();

      const result = await unconfiguredService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('none');
      expect(result.error).toContain('No email provider configured');
    });
  });

  describe('4. Transactional Email Templates Delivery', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test_key_12345';
      process.env.WEB_BASE_URL = 'https://kalpak-solutions.onrender.com';
      mailService.onModuleInit();
      mockResendSend.mockResolvedValue({
        data: { id: 'resend_msg_test' },
        error: null,
      });
    });

    it('sendVerificationEmail should build verification URL with token and deliver via Resend', async () => {
      const res = await mailService.sendVerificationEmail('admin@acme.com', 'raw_secret_token_123', 'Acme Corp');

      expect(res.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['admin@acme.com'],
          subject: 'Verify your email address - Acme Corp',
          html: expect.stringContaining('/verify-email?token=raw_secret_token_123'),
        })
      );
    });

    it('sendPasswordResetEmail should deliver reset link via Resend', async () => {
      const res = await mailService.sendPasswordResetEmail('admin@acme.com', 'reset_token_456');

      expect(res.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['admin@acme.com'],
          subject: 'Reset your password - Kalpak Solutions',
          html: expect.stringContaining('/reset-password?token=reset_token_456'),
        })
      );
    });

    it('sendInvitationEmail should deliver employee invitation link via Resend', async () => {
      const res = await mailService.sendInvitationEmail(
        'engineer@acme.com',
        'invite_token_789',
        'Acme Corp',
        'FIELD_ENGINEER',
        'Engineering',
        'Alice Smith'
      );

      expect(res.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['engineer@acme.com'],
          subject: expect.stringContaining('Acme Corp'),
          html: expect.stringContaining('/accept-invitation?token=invite_token_789'),
        })
      );
    });

    it('sendTicketCreatedNotification should send ticket acknowledgement with ticket number', async () => {
      const res = await mailService.sendTicketCreatedNotification({
        to: 'client@acme.com',
        ticketNumber: 'TCK-10023',
        title: 'Hydraulic Pump Pressure Alert',
        status: 'OPEN',
        priority: 'HIGH',
        organizationName: 'Acme Corp',
      });

      expect(res.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['client@acme.com'],
          subject: '[TCK-10023] Service Request Received: Hydraulic Pump Pressure Alert',
          html: expect.stringContaining('TCK-10023'),
        })
      );
    });

    it('sendSlaEscalationNotification should deliver escalation alert', async () => {
      const res = await mailService.sendSlaEscalationNotification({
        to: 'manager@acme.com',
        ticketNumber: 'TCK-10099',
        title: 'Critical VFD Overheat',
        organizationName: 'Acme Corp',
        hoursOverdue: 2,
      });

      expect(res.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['manager@acme.com'],
          subject: '⚠️ [URGENT SLA ESCALATION] Ticket #TCK-10099',
          html: expect.stringContaining('overdue by 2 hours'),
        })
      );
    });
  });
});
