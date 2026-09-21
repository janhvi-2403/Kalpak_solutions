import { Injectable } from '@nestjs/common';
import { getConfig } from '@kalpak/config';
import { logger } from '@kalpak/logger';

@Injectable()
export class MailService {
  private readonly config = getConfig();

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
    department?: string
  ): Promise<void> {
    const inviteUrl = `${this.config.WEB_BASE_URL}/accept-invitation?token=${token}`;

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
    console.log(`[TRANSACTIONAL EMAIL] You have been invited to join ${organizationName}`);
    console.log(`Recipient: ${email}`);
    console.log(`Role: ${role}`);
    if (department) console.log(`Department: ${department}`);
    console.log(`Accept Invitation URL: ${inviteUrl}`);
    console.log('======================================================\n');
  }
}
