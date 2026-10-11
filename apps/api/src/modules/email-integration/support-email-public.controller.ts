import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../core/auth/public.decorator';
import { SupportEmailsService } from './support-emails.service';
import { VerifySupportEmailTokenDto } from './dto/support-email.dto';

@ApiTags('Public Support Email Verification')
@Controller('auth/support-emails')
export class SupportEmailPublicController {
  constructor(private readonly supportEmailsService: SupportEmailsService) {}

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify support email address using single-use token from email' })
  @ApiResponse({ status: 200, description: 'Support email verified successfully' })
  async verifyTokenPost(@Body() dto: VerifySupportEmailTokenDto) {
    return this.supportEmailsService.verifyByToken(dto.token);
  }

  @Public()
  @Get('verify')
  @ApiOperation({ summary: 'Verify support email address using GET query link from email' })
  @ApiResponse({ status: 200, description: 'Support email verified successfully' })
  async verifyTokenGet(@Query('token') token: string) {
    return this.supportEmailsService.verifyByToken(token);
  }
}
