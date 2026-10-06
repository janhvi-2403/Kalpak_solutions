import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { OutgoingEmailService } from './outgoing-email.service';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { TenantContext, PermissionCode } from '@kalpak/types';
import { UpdateOutgoingEmailDto, SendTestEmailDto } from './dto/outgoing-email.dto';

@ApiTags('Outgoing Email Configuration')
@ApiBearerAuth()
@Controller('tenants/email-config/outgoing')
@UseGuards(TenantGuard, PermissionsGuard)
export class OutgoingEmailController {
  constructor(private readonly outgoingEmailService: OutgoingEmailService) {}

  @Get()
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get Outgoing Email configuration for current tenant' })
  @ApiResponse({ status: 200, description: 'Outgoing email configuration details' })
  async getOutgoingEmailConfig(@CurrentTenant() tenantCtx: TenantContext) {
    return this.outgoingEmailService.getOutgoingEmailConfig(tenantCtx.tenantId);
  }

  @Patch()
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Update Outgoing Email configuration for current tenant' })
  @ApiResponse({ status: 200, description: 'Updated outgoing email configuration' })
  async updateOutgoingEmailConfig(
    @CurrentTenant() tenantCtx: TenantContext,
    @Body() dto: UpdateOutgoingEmailDto
  ) {
    return this.outgoingEmailService.updateOutgoingEmailConfig(tenantCtx.tenantId, dto);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Send a real test email to verify outgoing email configuration' })
  @ApiResponse({ status: 200, description: 'Test email delivery result' })
  async sendTestEmail(
    @CurrentTenant() tenantCtx: TenantContext,
    @Body() dto: SendTestEmailDto
  ) {
    return this.outgoingEmailService.sendTestEmail(tenantCtx.tenantId, dto.recipientEmail);
  }
}
