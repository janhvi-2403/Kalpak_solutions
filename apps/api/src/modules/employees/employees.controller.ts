import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { UpdateEmployeeProfileDto } from './dto/employee.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Employees & Technicians')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(TenantGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermissions(PermissionCode.USER_READ)
  @ApiOperation({ summary: 'List all team members with department and skill tags' })
  async listEmployees(@CurrentTenant() tenantCtx: TenantContext) {
    return this.employeesService.listEmployees(tenantCtx.tenantId);
  }

  @Patch(':userId')
  @RequirePermissions(PermissionCode.USER_UPDATE)
  @ApiOperation({ summary: 'Update employee department, skills, designation, and availability' })
  async updateEmployee(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('userId') userId: string,
    @Body() dto: UpdateEmployeeProfileDto
  ) {
    return this.employeesService.updateEmployee(tenantCtx.tenantId, userId, user.id, dto);
  }
}
