import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentQueryDto,
  ToggleDepartmentStatusDto,
} from './dto/department.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
@UseGuards(TenantGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'List all departments for the current organization with filters' })
  async listDepartments(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query() query: DepartmentQueryDto
  ) {
    return this.departmentsService.listDepartments(tenantCtx.tenantId, query);
  }

  @Get('eligible-users')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'List eligible organization members for Department Head and POC assignment' })
  async getEligibleUsers(@CurrentTenant() tenantCtx: TenantContext) {
    return this.departmentsService.getEligibleUsers(tenantCtx.tenantId);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get department details, ticket metrics, customers served, and recent activity' })
  async getDepartment(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.departmentsService.getDepartment(tenantCtx.tenantId, id);
  }

  @Post()
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Create a new department' })
  async createDepartment(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateDepartmentDto
  ) {
    return this.departmentsService.createDepartment(tenantCtx.tenantId, user.id, dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Update department details' })
  async updateDepartment(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto
  ) {
    return this.departmentsService.updateDepartment(tenantCtx.tenantId, id, user.id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Activate or deactivate a department' })
  async toggleDepartmentStatus(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: ToggleDepartmentStatusDto
  ) {
    return this.departmentsService.toggleDepartmentStatus(
      tenantCtx.tenantId,
      id,
      user.id,
      dto.isActive
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Soft-delete a department' })
  async deleteDepartment(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string
  ) {
    return this.departmentsService.deleteDepartment(tenantCtx.tenantId, id, user.id);
  }
}
