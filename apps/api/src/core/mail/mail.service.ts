import { Injectable, OnModuleInit } from '@nestjs/common';
import { getConfig } from '@kalpak/config';
import { logger } from '@kalpak/logger';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

export interface EmailDispatchOptions {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  provider?: 'resend' | 'smtp' | 'none';
  error?: string;
  sandboxRerouted?: boolean;
  authorizedOwner?: string;
  originalRecipient?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly config = getConfig();
  private resend: Resend | null = null;

  onModuleInit() {
    this.initResend();
  }

  public getWebBaseUrl(): string {
    const configured = this.config.WEB_BASE_URL;
    if (process.env.NODE_ENV === 'production' && (!configured || configured.includes('localhost'))) {
      return 'https://kalpak-web.onrender.com';
    }
    return configured || 'https://kalpak-web.onrender.com';
  }

  /**
   * Initializes official Resend SDK client using server-side RESEND_API_KEY.
   */
  private initResend(): Resend | null {
    if (this.resend) {
      return this.resend;
    }

    const resendKey = (
      process.env.RESEND_API_KEY ||
      this.config.RESEND_API_KEY ||
      (process.env.EMAIL_PROVIDER === 'resend' ? process.env.EMAIL_PROVIDER_API_KEY : '') ||
      ''
    ).trim();

    if (resendKey) {
      try {
        this.resend = new Resend(resendKey);
        logger.info('[MailService] Resend email delivery service successfully initialized');
        return this.resend;
      } catch (err: any) {
        logger.error({ error: err.message }, '[MailService] Failed to initialize Resend client');
      }
    }

    return null;
  }

  /**
   * Returns authorized sender address.
   * Uses EMAIL_FROM if set; defaults to support@kalpak.solutions.
   */
  public getFromAddress(customSender?: string): string {
    if (customSender && customSender.trim()) {
      return customSender.trim();
    }

    const configuredFrom = (process.env.EMAIL_FROM || this.config.EMAIL_FROM || '').trim();
    if (configuredFrom) {
      return configuredFrom;
    }

    // Default authorized sender for Resend sandbox testing
    return 'Kalpak Solutions <onboarding@resend.dev>';
  }

  /**
   * Secondary fallback transporter for standard SMTP / Gmail / SendGrid
   */
  private getTransporter(forcedPort?: number): nodemailer.Transporter | null {
    if (process.env.SMTP_HOST || process.env.SMTP_USER) {
      const user = process.env.SMTP_USER || '';
      const pass = process.env.SMTP_PASS || '';
      const configuredPort = parseInt(process.env.SMTP_PORT || '2525', 10);
      // Cloud platforms like Render Free Tier silently block outbound ports 25, 465, and 587.
      // Port 2525 is Brevo's dedicated alternative port specifically supported to bypass cloud blocks.
      const port = forcedPort || (configuredPort === 587 ? 2525 : configuredPort);

      return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
    }

    const sendgridKey = process.env.SENDGRID_API_KEY || '';
    if (sendgridKey) {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: sendgridKey,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
    }

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
    }

    return null;
  }

  /**
   * Unified email dispatcher: sends via Brevo SMTP first to reach any recipient without sandbox restrictions.
   */
  async sendEmail(options: EmailDispatchOptions): Promise<EmailDispatchResult> {
    const { to, subject, text, html, replyTo } = options;
    const recipients = Array.isArray(to) ? to : [to];
    const fromAddress = this.getFromAddress(options.from);

    // 1. Always prioritize Brevo / SMTP transporter if configured so emails reach ANY recipient
    const hasSmtpConfig = Boolean(
      process.env.SMTP_HOST ||
      process.env.SMTP_USER ||
      (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
    );
    const preferredProvider = (
      process.env.EMAIL_OUTBOUND_PROVIDER ||
      process.env.EMAIL_PROVIDER ||
      ''
    ).toLowerCase();

    if (
      hasSmtpConfig ||
      preferredProvider === 'gmail' ||
      preferredProvider === 'smtp' ||
      preferredProvider === 'brevo'
    ) {
      // First attempt on port 2525 (bypasses Render firewall), fallback to 587 if needed
      const portsToTry = [2525, 587];
      for (const port of portsToTry) {
        const transporter = this.getTransporter(port);
        if (transporter) {
          try {
            const sender = process.env.GMAIL_USER
              ? `"Kalpak Solutions" <${process.env.GMAIL_USER}>`
              : (fromAddress.includes('onboarding@resend.dev')
                  ? 'Kalpak Solutions <support@kalpak.solutions>'
                  : fromAddress);

            const info = await transporter.sendMail({
              from: sender,
              to: recipients.join(', '),
              subject,
              text,
              html,
              replyTo: replyTo || 'support@kalpak.solutions',
            });
            logger.info({ messageId: info.messageId, to: recipients, port, subject }, '[MailService] Email sent successfully via Brevo SMTP to actual recipient');
            return { success: true, messageId: info.messageId, provider: 'smtp' };
          } catch (err: any) {
            logger.warn({ error: err.message, port, to: recipients }, `[MailService] SMTP dispatch failed on port ${port}, trying next...`);
          }
        }
      }
    }

    // 2. Primary Provider: Official Resend SDK
    const resendClient = this.initResend();
    if (resendClient) {
      try {
        const { data, error } = await resendClient.emails.send({
          from: fromAddress,
          to: recipients,
          subject,
          text,
          html,
          replyTo: replyTo || undefined,
        });

        if (error) {
          logger.error(
            { error: error.message, to: recipients, subject },
            '[MailService] Resend email delivery failed'
          );

          // If Resend failed (e.g. sandbox restriction: recipient is not the account owner),
          // check if secondary transporter (Gmail SMTP or SMTP) is available to deliver directly to the actual recipient!
          const transporter = this.getTransporter();
          if (transporter) {
            logger.info('[MailService] Resend delivery failed; trying secondary SMTP / Gmail transporter for actual recipient...');
            try {
              const sender = process.env.GMAIL_USER ? `"Kalpak Solutions" <${process.env.GMAIL_USER}>` : fromAddress;
              const info = await transporter.sendMail({
                from: sender,
                to: recipients.join(', '),
                subject,
                text,
                html,
                replyTo: replyTo || undefined,
              });
              logger.info({ messageId: info.messageId, to: recipients }, '[MailService] Email successfully delivered to actual recipient via secondary transporter');
              return { success: true, messageId: info.messageId, provider: 'smtp' };
            } catch (smtpErr: any) {
              logger.error({ error: smtpErr.message }, '[MailService] Secondary transporter failed');
            }
          }

          // If no secondary transporter or it failed, check for Resend sandbox restriction:
          const match = error.message.match(/your own email address \(([^)]+)\)/i);
          const authorizedOwner = (match && match[1] ? match[1] : (process.env.RESEND_OWNER_EMAIL || 'support@kalpak.solutions')).trim();

          if (authorizedOwner && !recipients.map((r) => r.toLowerCase()).includes(authorizedOwner.toLowerCase())) {
            logger.info(
              { authorizedOwner, originalRecipient: recipients[0] },
              '[MailService] Rerouting test email to authorized Resend account owner due to sandbox restriction'
            );
            const fallbackSubject = `[Testing for: ${recipients[0]}] ${subject}`;
            const fallbackHtml = `
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:16px;font-family:sans-serif;color:#92400e;font-size:13px;">
                <strong>Resend Sandbox Notice:</strong> This notification was generated for <strong>${recipients[0]}</strong>. Because your Resend account uses the sandbox domain <code>onboarding@resend.dev</code>, Resend only delivers to your account owner email (<code>${authorizedOwner}</code>). To deliver directly to <strong>${recipients[0]}</strong>, set <code>GMAIL_USER</code> and <code>GMAIL_APP_PASSWORD</code> in your environment variables or verify a domain in Resend.
              </div>
            ` + html;

            try {
              const fallbackSend = await resendClient.emails.send({
                from: fromAddress,
                to: [authorizedOwner],
                subject: fallbackSubject,
                text: `[Target Recipient: ${recipients[0]}]\n\n${text}`,
                html: fallbackHtml,
              });

              if (fallbackSend && !fallbackSend.error) {
                logger.info(
                  { id: fallbackSend.data?.id, to: authorizedOwner },
                  '[MailService] Email delivered to authorized Resend owner inbox as sandbox fallback'
                );
                return {
                  success: true,
                  messageId: fallbackSend.data?.id,
                  provider: 'resend',
                  sandboxRerouted: true,
                  authorizedOwner,
                  originalRecipient: recipients[0],
                };
              }
            } catch (fallbackErr: any) {
              logger.warn({ error: fallbackErr.message }, '[MailService] Fallback reroute failed');
            }
          }

          return { success: false, provider: 'resend', error: error.message };
        } else {
          logger.info(
            { id: data?.id, to: recipients, subject },
            '[MailService] Email delivered successfully via Resend'
          );
          return { success: true, messageId: data?.id, provider: 'resend' };
        }
      } catch (err: any) {
        logger.error(
          { error: err.message, to: recipients },
          '[MailService] Unexpected error sending via Resend SDK'
        );
        const transporter = this.getTransporter();
        if (transporter) {
          try {
            const sender = process.env.GMAIL_USER ? `"Kalpak Solutions" <${process.env.GMAIL_USER}>` : fromAddress;
            const info = await transporter.sendMail({
              from: sender,
              to: recipients.join(', '),
              subject,
              text,
              html,
              replyTo: replyTo || undefined,
            });
            return { success: true, messageId: info.messageId, provider: 'smtp' };
          } catch (smtpErr: any) {
            logger.error({ error: smtpErr.message }, '[MailService] Secondary transporter failed');
          }
        }
        return { success: false, provider: 'resend', error: err.message };
      }
    }

    // 2. Secondary Provider: SMTP Transporter (if configured)
    const transporter = this.getTransporter();
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress.includes('<') ? fromAddress : `"Kalpak Solutions" <${fromAddress}>`,
          to: recipients.join(', '),
          subject,
          text,
          html,
          replyTo: replyTo || undefined,
        });

        logger.info(
          { messageId: info.messageId, to: recipients, subject },
          '[MailService] Email sent successfully via SMTP'
        );
        return { success: true, messageId: info.messageId, provider: 'smtp' };
      } catch (err: any) {
        logger.error(
          { error: err.message, to: recipients },
          '[MailService] Failed to send email via SMTP'
        );
        return { success: false, provider: 'smtp', error: err.message };
      }
    }

    // 3. Fallback when no outbound mail provider is configured
    logger.warn(
      { to: recipients, subject },
      '[MailService] No outbound email provider configured. Please set RESEND_API_KEY or SMTP_HOST'
    );
    return { success: false, provider: 'none', error: 'No email provider configured' };
  }

  /**
   * Dispatches authentic account verification email containing secure single-use token link.
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    organizationName?: string
  ): Promise<EmailDispatchResult> {
    const verificationUrl = `${this.getWebBaseUrl()}/verify-email?token=${token}`;
    const orgSuffix = organizationName && organizationName !== 'Kalpak Solutions' ? ` (${organizationName})` : '';
    const subject = `Kalpak Solutions - Verify your email address${orgSuffix}`;
    const textContent = `Hello,\n\nPlease verify your email address to complete your registration${
      organizationName ? ` with ${organizationName}` : ''
    } on Kalpak Solutions by opening the following link in your browser:\n\n${verificationUrl}\n\nThis verification link will expire in 24 hours. If you did not create this account, please ignore this email.`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 12px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 28px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Kalpak Solutions</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.95;">Account Email Verification</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-top: 0; color: #0f172a;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Please confirm your email address to complete your registration${
          organizationName ? ` with <strong>${organizationName}</strong>` : ''
        } on the Kalpak platform.
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${verificationUrl}" style="background-color: #ea580c; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">This verification link will expire in 24 hours.</p>
      <p style="font-size: 11px; word-break: break-all; color: #94a3b8; font-family: monospace;">${verificationUrl}</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
      replyTo: 'support@kalpak.solutions',
    });
  }

  /**
   * Dispatches password reset email with secure expiring reset link.
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<EmailDispatchResult> {
    const resetUrl = `${this.getWebBaseUrl()}/reset-password?token=${token}`;
    const subject = 'Reset your password - Kalpak Solutions';
    const textContent = `You recently requested to reset the password for your Kalpak Solutions account. Use the following link to choose a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour. If you did not request a password reset, please ignore this email.`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 28px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Kalpak Solutions</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Password Reset Request</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        We received a request to reset your password. Click the button below to set a new password:
      </p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #ea580c; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 12px; color: #64748b;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
      <p style="font-size: 11px; word-break: break-all; color: #94a3b8; font-family: monospace;">${resetUrl}</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });
  }

  /**
   * Dispatches support email verification code and link.
   */
  async sendSupportEmailVerification(options: {
    email: string;
    code: string;
    token: string;
    organizationName: string;
    tenantSlug?: string;
  }): Promise<EmailDispatchResult> {
    const { email, code, token, organizationName, tenantSlug } = options;
    const verificationUrl = `${this.getWebBaseUrl()}/verify-support-email?token=${token}${
      tenantSlug ? `&tenant=${tenantSlug}` : ''
    }`;

    const subject = `Verify support email for ${organizationName}: ${code}`;
    const textContent = `A request was made to verify "${email}" as an official support email address for ${organizationName}.\n\nYour 6-Digit Verification Code: ${code}\n\nOr verify directly: ${verificationUrl}\n\nExpires in 24 hours.`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 32px 28px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Kalpak Solutions</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">Support Email Verification for <strong>${organizationName}</strong></p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 15px; margin-top: 0; color: #334155;">
        You are receiving this email because <strong>${organizationName}</strong> configured <strong>${email}</strong> as their support channel.
      </p>
      <div style="background-color: #fff7ed; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #fed7aa; text-align: center;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #c2410c;">Your Verification Code</span>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 0.25em; color: #ea580c; font-family: monospace; margin: 8px 0;">
          ${code}
        </div>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${verificationUrl}" style="background-color: #ea580c; color: #ffffff; padding: 13px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Confirm Support Email
        </a>
      </div>
      <p style="font-size: 11px; color: #94a3b8; font-family: monospace;">${verificationUrl}</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });
  }

  /**
   * Dispatches Super Admin bootstrap installation OTP code.
   */
  async sendBootstrapVerificationOtp(
    email: string,
    otpCode: string,
    token: string
  ): Promise<EmailDispatchResult> {
    const verificationUrl = `${this.getWebBaseUrl()}/verify-email?token=${token}`;
    const subject = `Super Admin Email Verification Code: ${otpCode}`;
    const textContent = `Your 6-Digit Super Admin Setup Code is: ${otpCode}\n\nOr verify directly at: ${verificationUrl}\n\nValid for 15 minutes.`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 28px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Kalpak Solutions</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Super Admin Security Verification</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-top: 0;">Hello Administrator,</p>
      <p style="font-size: 14px; color: #475569;">Enter this 6-digit confirmation code to complete system initialization:</p>
      <div style="background: #fff7ed; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #fed7aa; text-align: center;">
        <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.25em; color: #ea580c; font-family: monospace;">${otpCode}</span>
      </div>
      <p style="font-size: 12px; color: #64748b;">Valid for 15 minutes.</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });
  }

  /**
   * Dispatches employee workspace invitation email.
   */
  async sendInvitationEmail(
    email: string,
    token: string,
    organizationName: string,
    role: string,
    department?: string,
    fullName?: string,
    _phone?: string
  ): Promise<EmailDispatchResult> {
    const inviteUrl = `${this.getWebBaseUrl()}/accept-invitation?token=${token}`;
    const isCustomer = role === 'CUSTOMER';
    const roleTitle = role === 'DEPARTMENT_ADMIN' ? 'Department Head' : isCustomer ? 'Customer' : role;
    const greeting = fullName ? `Hello ${fullName},` : 'Hello,';
    const deptInfo = department ? ` for the ${department} Department` : '';

    const subject = isCustomer
      ? `Invitation to join ${organizationName} Customer Portal`
      : `You are invited to join ${organizationName} as ${roleTitle}${deptInfo}`;

    const textContent = `
${greeting}

You have been invited by ${organizationName} to join their Kalpak Service Operations workspace as ${roleTitle}${deptInfo}.

To activate your account and access your dashboard, please complete your setup using the link below:
${inviteUrl}

This invitation is valid for 7 days.
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 32px 16px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Kalpak Service Operations</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Official Workspace Invitation</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; font-weight: 600; margin-top: 0;">${greeting}</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        You have been officially invited by <strong>${organizationName}</strong> to join as <strong>${roleTitle}</strong>${deptInfo}.
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${inviteUrl}" style="background-color: #ea580c; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Accept Invitation & Setup Account
        </a>
      </div>
      <p style="font-size: 12px; color: #64748b;">This invitation link will expire in 7 days.</p>
      <p style="font-size: 11px; word-break: break-all; color: #94a3b8; font-family: monospace;">${inviteUrl}</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
      replyTo: 'support@kalpak.solutions',
    });
  }

  /**
   * Dispatches customer self-service portal invitation.
   */
  async sendCustomerPortalInvitationEmail(
    email: string,
    customerName: string,
    organizationName: string,
    portalUrl: string,
    tempPassword?: string
  ): Promise<EmailDispatchResult> {
    const subject = `Your Customer Support Portal Access - ${organizationName}`;
    const textContent = `Hello ${customerName},\n\nYou now have self-service access to the ${organizationName} Customer Support Portal.\n\nSign in here: ${portalUrl}\nLogin Email: ${email}${
      tempPassword ? `\nTemporary Password: ${tempPassword}` : ''
    }`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 28px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">${organizationName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Customer Portal Access</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-top: 0;">Hello <strong>${customerName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        You can now track your support tickets, review service contracts, and request maintenance through your customer portal.
      </p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #cbd5e1;">
        <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Login Email:</strong> <span style="font-family: monospace;">${email}</span></p>
        ${tempPassword ? `<p style="margin: 0; font-size: 13px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: bold;">${tempPassword}</span></p>` : ''}
      </div>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${portalUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
          Sign In to Customer Portal
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });
  }

  /**
   * Transactional Notification: New ticket created
   */
  async sendTicketCreatedNotification(options: {
    to: string;
    ticketNumber: string;
    title: string;
    organizationName: string;
    priority: string;
    status: string;
  }): Promise<EmailDispatchResult> {
    const { to, ticketNumber, title, organizationName, priority, status } = options;
    const subject = `[${ticketNumber}] Service Request Received: ${title}`;
    const textContent = `Hello,\n\nA new service request #${ticketNumber} has been logged with ${organizationName}.\n\nTitle: ${title}\nPriority: ${priority}\nStatus: ${status}\n\nOur service team will update you on progress.`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 24px; color: #ffffff;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 700;">Service Ticket Logged</h2>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Ticket #${ticketNumber}</p>
    </div>
    <div style="padding: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px;">${title}</h3>
      <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0;">Organization: <strong>${organizationName}</strong> | Priority: <strong>${priority}</strong> | Status: <strong>${status}</strong></p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Our support team is actively reviewing your request. You will receive updates as progress is made.</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({ to, subject, text: textContent, html: htmlContent });
  }

  /**
   * Transactional Notification: Ticket assigned to technician
   */
  async sendTicketAssignedNotification(options: {
    to: string;
    ticketNumber: string;
    title: string;
    assigneeName: string;
    organizationName: string;
  }): Promise<EmailDispatchResult> {
    const { to, ticketNumber, title, assigneeName, organizationName } = options;
    const subject = `[${ticketNumber}] Ticket Assigned to ${assigneeName}`;
    const textContent = `Service ticket #${ticketNumber} (${title}) has been assigned to technician ${assigneeName} at ${organizationName}.`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: #0f172a; padding: 20px 24px; color: #ffffff;">
      <h3 style="margin: 0; font-size: 16px;">Ticket Assignment Notice</h3>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; color: #334155;">Ticket <strong>#${ticketNumber}</strong> has been assigned to <strong>${assigneeName}</strong>.</p>
      <p style="font-size: 13px; color: #64748b;">Subject: ${title}</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({ to, subject, text: textContent, html: htmlContent });
  }

  /**
   * Transactional Notification: Ticket status updated / resolved / closed
   */
  async sendTicketStatusNotification(options: {
    to: string;
    ticketNumber: string;
    title: string;
    newStatus: string;
    organizationName: string;
  }): Promise<EmailDispatchResult> {
    const { to, ticketNumber, title, newStatus, organizationName } = options;
    const subject = `[${ticketNumber}] Status Updated: ${newStatus}`;
    const textContent = `Your ticket #${ticketNumber} (${title}) with ${organizationName} is now marked as ${newStatus}.`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: ${newStatus === 'RESOLVED' || newStatus === 'CLOSED' ? '#059669' : '#ea580c'}; padding: 20px 24px; color: #ffffff;">
      <h3 style="margin: 0; font-size: 16px;">Ticket Status: ${newStatus}</h3>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; color: #334155;">Ticket <strong>#${ticketNumber}</strong> (${title}) has been updated to <strong>${newStatus}</strong>.</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({ to, subject, text: textContent, html: htmlContent });
  }

  /**
   * Transactional Notification: SLA Escalation Warning
   */
  async sendSlaEscalationNotification(options: {
    to: string;
    ticketNumber: string;
    title: string;
    organizationName: string;
    hoursOverdue?: number;
  }): Promise<EmailDispatchResult> {
    const { to, ticketNumber, title, organizationName, hoursOverdue } = options;
    const subject = `⚠️ [URGENT SLA ESCALATION] Ticket #${ticketNumber}`;
    const textContent = `Urgent: Ticket #${ticketNumber} (${title}) at ${organizationName} has breached or is nearing its SLA resolution deadline${
      hoursOverdue ? ` (overdue by ${hoursOverdue} hours)` : ''
    }.`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fee2e2; overflow: hidden;">
    <div style="background: #dc2626; padding: 20px 24px; color: #ffffff;">
      <h3 style="margin: 0; font-size: 16px;">SLA Escalation Alert</h3>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; color: #991b1b; font-weight: 700;">Immediate action required for ticket #${ticketNumber}${
        hoursOverdue ? ` (overdue by ${hoursOverdue} hours)` : ''
      }.</p>
      <p style="font-size: 13px; color: #475569;">Title: ${title}</p>
      <p style="font-size: 12px; color: #64748b;">Organization: ${organizationName}</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({ to, subject, text: textContent, html: htmlContent });
  }
}
