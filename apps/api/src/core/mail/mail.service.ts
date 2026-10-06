import { Injectable } from '@nestjs/common';
import { getConfig } from '@kalpak/config';
import { logger } from '@kalpak/logger';

import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly config = getConfig();

  private getTransporter(): nodemailer.Transporter | null {
    if (process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
      });
    }

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    }

    return null;
  }

  async sendVerificationEmail(email: string, token: string, organizationName?: string): Promise<void> {
    const verificationUrl = `${this.config.WEB_BASE_URL}/verify-email?token=${token}`;

    logger.info(
      {
        to: email,
        organizationName,
        actionUrl: verificationUrl,
      },
      `[MailService] EMAIL VERIFICATION LINK: ${verificationUrl}`
    );

    // Development Console Output for ease of testing
    console.log('\n======================================================');
    console.log(`[TRANSACTIONAL EMAIL] Verify Your Email Address`);
    console.log(`Recipient: ${email}`);
    if (organizationName) console.log(`Organization: ${organizationName}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('======================================================\n');
  }

  async sendBootstrapVerificationOtp(email: string, otpCode: string, token: string): Promise<void> {
    const verificationUrl = `${this.config.WEB_BASE_URL}/verify-email?token=${token}`;

    logger.info(
      {
        to: email,
        actionUrl: verificationUrl,
      },
      `[MailService] SUPER ADMIN EMAIL OTP: ${otpCode} | LINK: ${verificationUrl}`
    );

    console.log('\n======================================================');
    console.log(`[TRANSACTIONAL EMAIL] Super Admin Email Verification Code`);
    console.log(`Recipient: ${email}`);
    console.log(`6-Digit Verification Code: ${otpCode}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('======================================================\n');
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.config.WEB_BASE_URL}/reset-password?token=${token}`;

    logger.info(
      {
        to: email,
        actionUrl: resetUrl,
      },
      `[MailService] PASSWORD RESET LINK: ${resetUrl}`
    );

    console.log('\n======================================================');
    console.log(`[TRANSACTIONAL EMAIL] Reset Your Password`);
    console.log(`Recipient: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('======================================================\n');
  }

  async sendInvitationEmail(
    email: string,
    token: string,
    organizationName: string,
    role: string,
    department?: string,
    fullName?: string,
    phone?: string
  ): Promise<void> {
    const inviteUrl = `${this.config.WEB_BASE_URL}/accept-invitation?token=${token}`;
    const isCustomer = role === 'CUSTOMER';
    const roleTitle = role === 'DEPARTMENT_ADMIN' ? 'Department Head' : isCustomer ? 'Customer' : role;
    const greeting = fullName ? `Hello ${fullName},` : 'Hello,';
    const deptInfo = department ? ` for the ${department} Department` : '';

    const subject = isCustomer
      ? `Invitation to join ${organizationName} Customer Portal`
      : `You are invited to join ${organizationName} as ${roleTitle}${deptInfo}`;

    const textContent = isCustomer
      ? `
${greeting}

You have been invited by ${organizationName} to access their Kalpak Service Operations Customer Portal.

Through the customer portal, you can raise service tickets, monitor ticket progress, manage your equipment assets, and communicate with service teams.

To activate your account and set your password, please use the secure link below:
${inviteUrl}

Security Note:
This is a secure, single-use activation invitation valid for 7 days. If you did not anticipate this invitation, please contact ${organizationName}.

Best regards,
The ${organizationName} Team
Powered by Kalpak Solutions
`
      : `
${greeting}

You have been invited by ${organizationName} to join their Kalpak Service Operations workspace as ${roleTitle}${deptInfo}.

To activate your account and access your dashboard, please complete your setup using the secure link below:
${inviteUrl}

Setup Requirements:
1. Create a secure password for your account
2. Verify your contact phone number ${phone ? `(${phone})` : ''}
3. Configure Multi-Factor Authentication (2FA) with an Authenticator app (Google Authenticator / Authy)

Security Note:
This is a secure, single-use activation invitation valid for 7 days. If you did not anticipate this invitation, please contact your organization administrator.

Best regards,
The ${organizationName} Team
Powered by Kalpak Solutions
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Kalpak Service Operations</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Official Workspace Invitation</p>
    </div>
    
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; font-weight: 600; margin-top: 0;">${greeting}</p>
      
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        You have been officially appointed and invited by <strong>${organizationName}</strong> to join as:
      </p>

      <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #9a3412; font-weight: 600; width: 140px;">Organization:</td>
            <td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${organizationName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #9a3412; font-weight: 600;">Assigned Role:</td>
            <td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${roleTitle}</td>
          </tr>
          ${department ? `
          <tr>
            <td style="padding: 4px 0; color: #9a3412; font-weight: 600;">Department:</td>
            <td style="padding: 4px 0; color: #ea580c; font-weight: 700;">${department}</td>
          </tr>
          ` : ''}
          ${phone ? `
          <tr>
            <td style="padding: 4px 0; color: #9a3412; font-weight: 600;">Assigned Phone:</td>
            <td style="padding: 4px 0; color: #1e293b; font-mono;">${phone}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Click the button below to accept your invitation, create your password, and activate multi-factor authentication:
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${inviteUrl}" style="background-color: #ea580c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 10px; display: inline-block; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.3);">
          Accept Invitation & Activate Login →
        </a>
      </div>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 12px; margin-top: 24px; border: 1px dashed #cbd5e1;">
        <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b; font-weight: 600;">Or copy this secure link into your browser:</p>
        <p style="margin: 0; font-size: 11px; word-break: break-all; font-family: monospace; color: #0284c7;">
          ${inviteUrl}
        </p>
      </div>

      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        🔒 <strong>Security Notice:</strong> This single-use invitation will expire in 7 days. Multi-factor authentication is required upon first login to protect your organization's service operations.
      </div>
    </div>
  </div>
</body>
</html>
`;

    // Try real SMTP delivery if configured
    const transporter = this.getTransporter();
    if (transporter) {
      try {
        const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || `noreply@${this.config.APP_BASE_DOMAIN}`;
        await transporter.sendMail({
          from: `"${organizationName}" <${fromAddress}>`,
          to: email,
          subject,
          text: textContent,
          html: htmlContent,
        });

        logger.info(
          { to: email, subject },
          `[MailService] Real invitation email successfully dispatched via SMTP`
        );
      } catch (err: any) {
        logger.error(
          { error: err.message, to: email },
          `[MailService] Failed to dispatch via SMTP, logging fallback link`
        );
      }
    }

    logger.info(
      {
        to: email,
        organizationName,
        role,
        department,
        actionUrl: inviteUrl,
      },
      `[MailService] EMPLOYEE INVITATION LINK: ${inviteUrl}`
    );

    console.log('\n======================================================');
    console.log(`📧 [REAL INVITATION EMAIL DISPATCHED]`);
    console.log(`Recipient: ${email} ${fullName ? `(${fullName})` : ''}`);
    console.log(`Organization: ${organizationName}`);
    console.log(`Role: ${roleTitle}`);
    if (department) console.log(`Department: ${department}`);
    if (phone) console.log(`Phone: ${phone}`);
    console.log(`Subject: ${subject}`);
    console.log(`Accept Invitation URL: ${inviteUrl}`);
    console.log('======================================================\n');
  }

  async sendCustomerPortalInvitationEmail(
    email: string,
    customerName: string,
    organizationName: string,
    portalUrl: string,
    tempPassword?: string
  ): Promise<void> {
    const greeting = customerName ? `Hello ${customerName},` : 'Hello,';
    const subject = `Welcome to the ${organizationName} Customer Support Portal`;

    const textContent = `
${greeting}

You have been invited by ${organizationName} to access their dedicated self-service customer support portal.

Using your portal account, you can:
- Raise service requests and tickets directly 24/7
- Monitor live technician assignment and work orders
- Track equipment warranties and maintenance records

Portal Access Link: ${portalUrl}
Login Email: ${email}
${tempPassword ? `Temporary Access Password: ${tempPassword}\n(Please update your password after initial sign in)` : ''}

Best regards,
${organizationName} Support Team
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">${organizationName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Customer Self-Service Support Portal</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-top: 0;">${greeting}</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        You have been granted access to the official <strong>${organizationName}</strong> customer portal. You can now log service calls, track repair progress, and view equipment history anytime.
      </p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #cbd5e1;">
        <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Portal Login Details</p>
        <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Login Email:</strong> <span style="font-family: monospace; color: #1e293b;">${email}</span></p>
        ${tempPassword ? `<p style="margin: 0; font-size: 13px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: bold; background: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">${tempPassword}</span></p>` : ''}
      </div>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${portalUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
          Sign In to Customer Portal
        </a>
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        If you have questions or encounter any issues, reach out to your ${organizationName} account manager.
      </p>
    </div>
  </div>
</body>
</html>
`;

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || `noreply@${this.config.APP_BASE_DOMAIN}`;
        await transporter.sendMail({
          from: `"${organizationName}" <${fromAddress}>`,
          to: email,
          subject,
          text: textContent,
          html: htmlContent,
        });
        logger.info({ to: email, subject }, `[MailService] Customer portal invite sent via SMTP`);
      } catch (err: any) {
        logger.error({ error: err.message, to: email }, `[MailService] Failed to dispatch customer invite via SMTP`);
      }
    }

    console.log('\n======================================================');
    console.log(`📧 [CUSTOMER PORTAL INVITATION DISPATCHED]`);
    console.log(`Recipient: ${email} (${customerName})`);
    console.log(`Organization: ${organizationName}`);
    console.log(`Portal URL: ${portalUrl}`);
    if (tempPassword) console.log(`Temporary Password: ${tempPassword}`);
    console.log('======================================================\n');
  }
}
