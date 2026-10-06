import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SupportEmailsService } from './support-emails.service';
import { CreateSupportEmailDto, UpdateSupportEmailDto } from './dto/support-email.dto';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { TenantContext, PermissionCode } from '@kalpak/types';


@ApiTags('Support Email Configuration')
@ApiBearerAuth()
@Controller('tenants/support-emails')
@UseGuards(TenantGuard, PermissionsGuard)
export class SupportEmailsController {
  constructor(private readonly supportEmailsService: SupportEmailsService) {}

  @Get()
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'List all support email addresses for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of support email addresses' })
  async listSupportEmails(@CurrentTenant() tenantCtx: TenantContext) {
    return this.supportEmailsService.listSupportEmails(tenantCtx.tenantId);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get a specific support email address by ID' })
  @ApiResponse({ status: 200, description: 'Support email details' })
  async getSupportEmail(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.supportEmailsService.getSupportEmailById(tenantCtx.tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Add a new support email address for the tenant' })
  @ApiResponse({ status: 201, description: 'Support email created successfully' })
  async createSupportEmail(
    @CurrentTenant() tenantCtx: TenantContext,
    @Body() dto: CreateSupportEmailDto
  ) {
    return this.supportEmailsService.createSupportEmail(tenantCtx.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Update a support email address (display name, email, default, active)' })
  @ApiResponse({ status: 200, description: 'Support email updated successfully' })
  async updateSupportEmail(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateSupportEmailDto
  ) {
    return this.supportEmailsService.updateSupportEmail(tenantCtx.tenantId, id, dto);
  }

  @Patch(':id/set-default')
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Designate a support email address as the default for the organization' })
  @ApiResponse({ status: 200, description: 'Support email marked as default' })
  async setDefault(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.supportEmailsService.setDefault(tenantCtx.tenantId, id);
  }

  @Patch(':id/toggle-status')
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Activate or deactivate a support email address' })
  @ApiResponse({ status: 200, description: 'Status toggled successfully' })
  async toggleStatus(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string,
    @Body('isActive') isActive?: boolean
  ) {
    return this.supportEmailsService.toggleStatus(tenantCtx.tenantId, id, isActive);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Remove a support email address from the organization' })
  @ApiResponse({ status: 200, description: 'Support email deleted successfully' })
  async deleteSupportEmail(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.supportEmailsService.deleteSupportEmail(tenantCtx.tenantId, id);
  }

  @Post(':id/verify')
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Verify a support email address in real-time' })
  @ApiResponse({ status: 200, description: 'Support email verified successfully' })
  async verifySupportEmail(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.supportEmailsService.verifySupportEmail(tenantCtx.tenantId, id);
  }
}
