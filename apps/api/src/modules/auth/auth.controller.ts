import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { Public } from '../../core/auth/public.decorator';
import { AllowUnverifiedMfa } from '../../core/auth/session-auth.guard';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { UserPrincipal } from '@kalpak/types';
import { getConfig } from '@kalpak/config';
import { generateCsrfToken } from '@kalpak/auth';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly config = getConfig();

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful. HttpOnly session cookie issued.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await this.authService.login(dto, ipAddress, userAgent);

    // Set secure HttpOnly cookie for browser clients
    const maxAgeMs = this.config.SESSION_TTL_HOURS * 60 * 60 * 1000;
    res.cookie(this.config.SESSION_COOKIE_NAME, result.rawToken, {
      httpOnly: true,
      secure: this.config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: maxAgeMs,
      path: '/',
    });

    return {
      user: result.user,
      activeTenantId: result.activeTenantId,
      memberships: result.memberships,
      mfaRequired: result.mfaRequired,
      tenantSelectionRequired: result.tenantSelectionRequired,
      // Provide session token explicitly for headless/mobile API clients
      token: result.rawToken,
    };
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new B2B tenant organization and first client administrator' })
  async signup(
    @Body() dto: SignupDto,
    @Req() req: Request
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authService.signup(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with single-use expiring token' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authService.verifyEmail(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification token' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset token email' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authService.forgotPassword(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password with valid token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authService.resetPassword(dto, ipAddress, userAgent);
  }

  @Public()
  @Get('invitations/:token')
  @ApiOperation({ summary: 'Get public invitation details for employee acceptance' })
  async getPublicInvitation(@Param('token') token: string) {
    return this.authService.getPublicInvitation(token);
  }

  @Public()
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept employee invitation and set account password' })
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authService.acceptInvitation(dto, ipAddress, userAgent);
  }

  @AllowUnverifiedMfa()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit TOTP code for MFA challenge' })
  async verifyMfa(
    @Body() dto: MfaVerifyDto,
    @Req() req: Request & { session?: { id: string } }
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');
    const sessionId = req.session?.id as string;

    return this.authService.verifyMfa(sessionId, dto.code, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke active session and clear authentication cookie' })
  async logout(
    @Req() req: Request & { session?: { id: string } },
    @Res({ passthrough: true }) res: Response
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');
    const sessionId = req.session?.id;

    if (sessionId) {
      await this.authService.logout(sessionId, ipAddress, userAgent);
    }

    res.clearCookie(this.config.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user identity, active tenant, and assigned permissions' })
  async getMe(
    @CurrentUser() user: UserPrincipal,
    @Req() req: Request & { session?: { id: string } }
  ) {
    return this.authService.getCurrentSession(user.id, req.session?.id as string);
  }

  @Get('csrf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate CSRF protection token for active session' })
  getCsrfToken(@Req() req: Request & { session?: { id: string } }) {
    const sessionId = req.session?.id || 'anonymous';
    const csrfToken = generateCsrfToken(sessionId, this.config.CSRF_SECRET);
    return { csrfToken };
  }
}
