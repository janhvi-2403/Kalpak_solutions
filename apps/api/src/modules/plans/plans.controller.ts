import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Public } from '../../core/auth/public.decorator';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { UserPrincipal, PermissionCode } from '@kalpak/types';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Subscription Plans & Pricing')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public: Retrieve all active subscription plans for landing page and client portal' })
  @ApiResponse({ status: 200, description: 'List of active subscription plans' })
  async getActivePlans() {
    return this.plansService.getActivePlans();
  }

  @Get('manage')
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_MANAGE_ALL)
  @ApiOperation({ summary: 'Super Admin: Retrieve all plans catalogue (Active, Inactive, Draft, Archived)' })
  @ApiResponse({ status: 200, description: 'Complete catalogue of subscription plans' })
  async getAllPlansForManagement() {
    return this.plansService.getAllPlansForManagement();
  }

  @Public()
  @Get(':idOrCode')
  @ApiOperation({ summary: 'Public: Get specific plan by ID or code' })
  async getPlanByIdOrCode(@Param('idOrCode') idOrCode: string) {
    return this.plansService.getPlanByIdOrCode(idOrCode);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_MANAGE_ALL)
  @ApiOperation({ summary: 'Super Admin: Create a new custom subscription plan' })
  @ApiResponse({ status: 201, description: 'Plan successfully created' })
  async createPlan(@Body() dto: CreatePlanDto, @CurrentUser() user: UserPrincipal) {
    return this.plansService.createPlan(dto, user?.id);
  }

  @Put(':id')
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_MANAGE_ALL)
  @ApiOperation({ summary: 'Super Admin: Update plan metadata, pricing, limits, and features' })
  @ApiResponse({ status: 200, description: 'Plan successfully updated' })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: UserPrincipal
  ) {
    return this.plansService.updatePlan(id, dto, user?.id);
  }

  @Patch(':id/status')
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_MANAGE_ALL)
  @ApiOperation({ summary: 'Super Admin: Change plan status (ACTIVE, INACTIVE, DRAFT, ARCHIVED)' })
  @ApiResponse({ status: 200, description: 'Plan status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED',
    @CurrentUser() user: UserPrincipal
  ) {
    return this.plansService.updatePlanStatus(id, status, user?.id);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_MANAGE_ALL)
  @ApiOperation({ summary: 'Super Admin: Duplicate an existing plan with all limits and feature toggles' })
  @ApiResponse({ status: 201, description: 'Plan duplicated successfully' })
  async duplicatePlan(@Param('id') id: string, @CurrentUser() user: UserPrincipal) {
    return this.plansService.duplicatePlan(id, user?.id);
  }

  @Delete(':id')
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_MANAGE_ALL)
  @ApiOperation({ summary: 'Super Admin: Permanently delete a subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan permanently deleted' })
  async deletePlan(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: UserPrincipal
  ) {
    return this.plansService.deletePlan(id, force === 'true', user?.id);
  }

  @Post(':id/archive')
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.TENANT_MANAGE_ALL)
  @ApiOperation({ summary: 'Super Admin: Archive a plan' })
  @ApiResponse({ status: 200, description: 'Plan archived' })
  async archivePlan(@Param('id') id: string, @CurrentUser() user: UserPrincipal) {
    return this.plansService.archivePlan(id, user?.id);
  }
}
