import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { BootstrapService } from './bootstrap.service';
import { InitBootstrapDto } from './dto/init-bootstrap.dto';
import { VerifyBootstrapMfaDto } from './dto/verify-bootstrap-mfa.dto';
import { VerifyBootstrapEmailDto } from './dto/verify-bootstrap-email.dto';
import { Public } from '../../core/auth/public.decorator';
import { getConfig } from '@kalpak/config';

@ApiTags('Super Admin Bootstrap')
@Controller('bootstrap')
export class BootstrapController {
  private readonly config = getConfig();

  constructor(private readonly bootstrapService: BootstrapService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Check if system is authorized and available for initial Super Admin bootstrap' })
  @ApiResponse({ status: 200, description: 'Bootstrap availability status returned.' })
  async getStatus() {
    return this.bootstrapService.getBootstrapStatus();
  }

  @Public()
  @Post('init')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate one-time Super Admin bootstrap with deployment authorization' })
  @ApiHeader({
    name: 'x-bootstrap-secret',
    required: false,
    description: 'Deployment initialization secret (alternatively provided in request body)',
  })
  @ApiResponse({ status: 200, description: 'Super Admin staged, verification email sent, and TOTP QR payload generated.' })
  @ApiResponse({ status: 403, description: 'Invalid deployment secret or bootstrap disabled' })
  @ApiResponse({ status: 409, description: 'Bootstrap already completed or Super Admin already exists' })
  async initBootstrap(
    @Body() dto: InitBootstrapDto,
    @Headers('x-bootstrap-secret') headerSecret: string | undefined,
    @Req() req: Request
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.bootstrapService.initBootstrap(dto, headerSecret, ipAddress, userAgent);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit confirmation code sent to official email' })
  @ApiResponse({ status: 200, description: 'Official email address successfully verified.' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  @ApiResponse({ status: 401, description: 'Expired staging session' })
  async verifyBootstrapEmail(
    @Body() dto: VerifyBootstrapEmailDto,
    @Req() req: Request
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.bootstrapService.verifyBootstrapEmail(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('resend-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification code for active bootstrap staging session' })
  @ApiResponse({ status: 200, description: 'Verification email resent.' })
  async resendBootstrapEmail(@Body('tempToken') tempToken: string) {
    return this.bootstrapService.resendBootstrapEmail(tempToken);
  }

  @Public()
  @Post('verify-mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify initial TOTP code, activate Super Admin, and permanently lock bootstrap' })
  @ApiResponse({ status: 200, description: 'Super Admin activated, bootstrap locked, HttpOnly session cookie issued.' })
  @ApiResponse({ status: 400, description: 'Invalid TOTP verification code or unverified email' })
  @ApiResponse({ status: 401, description: 'Expired or invalid staging session' })
  async verifyBootstrapMfa(
    @Body() dto: VerifyBootstrapMfaDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await this.bootstrapService.verifyBootstrapMfaComplete(
      dto,
      ipAddress,
      userAgent
    );

    // Issue secure HttpOnly cookie for Super Admin session
    const maxAgeMs = this.config.SESSION_TTL_HOURS * 60 * 60 * 1000;
    res.cookie(this.config.SESSION_COOKIE_NAME, result.rawToken, {
      httpOnly: true,
      secure: this.config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: maxAgeMs,
      path: '/',
    });

    return {
      success: result.success,
      message: result.message,
      user: result.user,
      backupCodes: result.backupCodes,
      token: result.rawToken,
    };
  }
}
