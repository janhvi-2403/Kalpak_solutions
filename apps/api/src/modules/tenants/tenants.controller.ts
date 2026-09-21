import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateTenantPolicyDto } from './dto/update-tenant-policy.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get current active tenant details' })
  async getCurrentTenant(@CurrentTenant() tenantCtx: TenantContext) {
    return this.tenantsService.getTenantDetails(tenantCtx.tenantId);
  }

  @Post('switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch active tenant context for the current session' })
  async switchTenant(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: SwitchTenantDto,
    @Req() req: Request & { session?: { id: string } }
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');
    const sessionId = req.session?.id as string;

    return this.tenantsService.switchTenant(
      user.id,
      dto.tenantId,
      sessionId,
      user.isSuperAdmin,
      ipAddress,
      userAgent
    );
  }

  // --------------------------------------------------------------------------
  // Onboarding Endpoints
  // --------------------------------------------------------------------------

  @Get('onboarding')
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Get onboarding wizard status and stored step data' })
  async getOnboarding(@CurrentTenant() tenantCtx: TenantContext) {
    return this.tenantsService.getOnboardingState(tenantCtx.tenantId);
  }

  @Patch('onboarding')
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Save onboarding progress or configuration step' })
  async updateOnboarding(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: UpdateOnboardingDto
  ) {
    return this.tenantsService.updateOnboardingState(tenantCtx.tenantId, user.id, dto);
  }

  @Post('onboarding/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Finalize onboarding wizard and activate organization operational mode' })
  async completeOnboarding(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal
  ) {
    return this.tenantsService.completeOnboarding(tenantCtx.tenantId, user.id);
  }

  // --------------------------------------------------------------------------
  // Employee Invitation Endpoints
  // --------------------------------------------------------------------------

  @Post('invitations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.USER_CREATE)
  @ApiOperation({ summary: 'Invite a new employee to join this organization' })
  async createInvitation(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateInvitationDto
  ) {
    return this.tenantsService.createInvitation(tenantCtx.tenantId, user.id, dto);
  }

  @Get('invitations')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.USER_READ)
  @ApiOperation({ summary: 'List pending invitations for the current organization' })
  async listInvitations(@CurrentTenant() tenantCtx: TenantContext) {
    return this.tenantsService.listInvitations(tenantCtx.tenantId);
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.USER_DELETE)
  @ApiOperation({ summary: 'Revoke a pending employee invitation' })
  async revokeInvitation(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string
  ) {
    return this.tenantsService.revokeInvitation(tenantCtx.tenantId, id, user.id);
  }

  // --------------------------------------------------------------------------
  // Tenant Configuration Matrix & Policy Endpoints
  // --------------------------------------------------------------------------

  @Get('policy')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get current tenant configuration and policy matrix' })
  async getTenantPolicy(@CurrentTenant() tenantCtx: TenantContext) {
    return this.tenantsService.getTenantPolicy(tenantCtx.tenantId);
  }

  @Patch('policy')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_SETTINGS)
  @ApiOperation({ summary: 'Update current tenant configuration and policy matrix' })
  async updateTenantPolicy(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: UpdateTenantPolicyDto
  ) {
    return this.tenantsService.updateTenantPolicy(tenantCtx.tenantId, user.id, dto);
  }

  @Get(':id/policy')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_MANAGE_ALL)
  @ApiOperation({ summary: 'Super Admin: Get policy matrix for any tenant' })
  async getTenantPolicyById(@Param('id') tenantId: string) {
    return this.tenantsService.getTenantPolicy(tenantId);
  }

  @Patch(':id/policy')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_MANAGE_ALL)
  @ApiOperation({ summary: 'Super Admin: Update policy matrix for any tenant' })
  async updateTenantPolicyById(
    @Param('id') tenantId: string,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: UpdateTenantPolicyDto
  ) {
    return this.tenantsService.updateTenantPolicy(tenantId, user.id, dto);
  }
}
