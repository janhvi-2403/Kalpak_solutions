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
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TestIncomingEmailDto {
  @ApiPropertyOptional({ description: 'Optional flag to simulate email reception for verification' })
  @IsOptional()
  @IsBoolean()
  simulateReception?: boolean;
}

@ApiTags('Incoming Email Configuration')
@ApiBearerAuth()
@Controller('tenants/email-config/incoming')
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
}
