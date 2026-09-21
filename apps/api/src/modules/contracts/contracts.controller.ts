import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  CreatePmScheduleDto,
  ContractQueryDto,
} from './dto/contract.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Service Contracts & PM Scheduling')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(TenantGuard, PermissionsGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('summary')
  @RequirePermissions(PermissionCode.SERVICE_READ)
  @ApiOperation({ summary: 'Get contracts and PM schedules dashboard KPI metrics' })
  async getDashboardStats(@CurrentTenant() tenantCtx: TenantContext) {
    return this.contractsService.getDashboardStats(tenantCtx.tenantId);
  }

  @Get()
  @RequirePermissions(PermissionCode.SERVICE_READ)
  @ApiOperation({ summary: 'List all service contracts (AMCs) with filtering' })
  async listContracts(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query() query: ContractQueryDto
  ) {
    return this.contractsService.listContracts(tenantCtx.tenantId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.SERVICE_MANAGE)
  @ApiOperation({ summary: 'Create a new Annual Maintenance Contract (AMC)' })
  async createContract(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateContractDto
  ) {
    return this.contractsService.createContract(tenantCtx.tenantId, user.id, dto);
  }

  @Get('schedules')
  @RequirePermissions(PermissionCode.SERVICE_READ)
  @ApiOperation({ summary: 'List preventive maintenance schedules' })
  async listPmSchedules(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query('assetId') assetId?: string
  ) {
    return this.contractsService.listPmSchedules(tenantCtx.tenantId, assetId);
  }

  @Post('schedules')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.SERVICE_MANAGE)
  @ApiOperation({ summary: 'Configure a new Preventive Maintenance (PM) schedule' })
  async createPmSchedule(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreatePmScheduleDto
  ) {
    return this.contractsService.createPmSchedule(tenantCtx.tenantId, user.id, dto);
  }

  @Post('schedules/:id/trigger')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.SERVICE_MANAGE)
  @ApiOperation({ summary: 'Dispatch and auto-generate PM ticket and work order' })
  async triggerPmVisit(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string
  ) {
    return this.contractsService.triggerPmVisit(tenantCtx.tenantId, user.id, id);
  }

  @Get('customer/:customerId')
  @RequirePermissions(PermissionCode.SERVICE_READ)
  @ApiOperation({ summary: 'List contracts and schedules for a specific customer' })
  async getCustomerContracts(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('customerId') customerId: string
  ) {
    return this.contractsService.getCustomerPortalContracts(tenantCtx.tenantId, customerId);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.SERVICE_READ)
  @ApiOperation({ summary: 'Get service contract detail with covered machinery and PM plans' })
  async getContractDetail(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.contractsService.getContractDetail(tenantCtx.tenantId, id);
  }
}
