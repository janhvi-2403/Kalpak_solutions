import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Users & Identity')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get profile information for the authenticated user' })
  async getMyProfile(@CurrentUser() user: UserPrincipal) {
    return this.usersService.getProfile(user.id);
  }

  @Get()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.USER_READ)
  @ApiOperation({ summary: 'List user members belonging to the active tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  async getTenantUsers(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('departmentId') departmentId?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20;

    return this.usersService.listTenantUsers(tenantCtx.tenantId, pageNum, limitNum, departmentId);
  }

  @Patch(':id/status')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.USER_UPDATE)
  @ApiOperation({ summary: 'Update user active/inactive status without deleting historical tickets' })
  async updateUserStatus(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') userId: string,
    @Body('isActive') isActive: boolean
  ) {
    return this.usersService.updateUserStatus(tenantCtx.tenantId, userId, isActive, user.id);
  }
}
