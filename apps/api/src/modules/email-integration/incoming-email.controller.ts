import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IncomingEmailService } from './incoming-email.service';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { TenantContext, PermissionCode } from '@kalpak/types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TestIncomingEmailDto {
  @ApiPropertyOptional({ description: 'Optional flag to simulate email reception for verification' })
  @IsOptional()
  @IsBoolean()
  simulateReception?: boolean;
}

export class SimulateEmailQueryDto {
  @ApiPropertyOptional({ description: 'Sender email address of customer', example: 'customer@clientcorp.com' })
  @IsString()
  fromEmail!: string;

  @ApiPropertyOptional({ description: 'Customer sender name', example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Subject line of email query', example: 'Emergency: Motor overheating on conveyor #2' })
  @IsString()
  subject!: string;

  @ApiPropertyOptional({ description: 'Body text of email inquiry', example: 'Our conveyor motor is running abnormally hot.' })
  @IsString()
  bodyText!: string;

  @ApiPropertyOptional({ description: 'Optional recipient email (defaults to tenant support email)' })
  @IsOptional()
  @IsString()
  toEmail?: string;
}

@ApiTags('Incoming Email Configuration')
@ApiBearerAuth()
@Controller(['tenants/email-config/incoming', 'incoming-email/config'])
@UseGuards(TenantGuard, PermissionsGuard)
export class IncomingEmailController {
  constructor(private readonly incomingEmailService: IncomingEmailService) {}

  @Get()
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get Incoming Email forwarding details and status for current tenant' })
  @ApiResponse({ status: 200, description: 'Incoming email configuration details' })
  async getIncomingEmailConfig(@CurrentTenant() tenantCtx: TenantContext) {
    return this.incomingEmailService.getIncomingEmailConfig(tenantCtx.tenantId);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Test whether forwarded incoming emails are being received' })
  @ApiResponse({ status: 200, description: 'Test result and current connection status' })
  async testIncomingEmail(
    @CurrentTenant() tenantCtx: TenantContext,
    @Body() body?: TestIncomingEmailDto
  ) {
    return this.incomingEmailService.testIncomingEmail(
      tenantCtx.tenantId,
      body?.simulateReception
    );
  }

  @Post('simulate-query')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Simulate an incoming email query from a customer to generate a real ticket' })
  @ApiResponse({ status: 200, description: 'Result of email ingestion and generated ticket details' })
  async simulateEmailQuery(
    @CurrentTenant() tenantCtx: TenantContext,
    @Body() body: SimulateEmailQueryDto
  ) {
    return this.incomingEmailService.simulateEmailQuery(tenantCtx.tenantId, body);
  }
}

