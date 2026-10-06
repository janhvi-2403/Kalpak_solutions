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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(TenantGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'List all client customers with search support' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['ALL', 'ACTIVE', 'INACTIVE'] })
  async listCustomers(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    return this.customersService.listCustomers(tenantCtx.tenantId, search, status);
  }

  @Get('stats')
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'Get customer summary statistics (total, active, inactive, open tickets)' })
  async getCustomerStats(@CurrentTenant() tenantCtx: TenantContext) {
    return this.customersService.getStats(tenantCtx.tenantId);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'Get customer details including installed equipment and ticket history' })
  async getCustomer(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.customersService.getCustomer(tenantCtx.tenantId, id);
  }

  @Post()
  @RequirePermissions(PermissionCode.CUSTOMER_CREATE)
  @ApiOperation({ summary: 'Register a new customer account' })
  async createCustomer(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateCustomerDto
  ) {
    return this.customersService.createCustomer(tenantCtx.tenantId, user.id, dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Update customer details' })
  async updateCustomer(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto
  ) {
    return this.customersService.updateCustomer(tenantCtx.tenantId, id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Soft-delete a customer account' })
  async deleteCustomer(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string
  ) {
    return this.customersService.deleteCustomer(tenantCtx.tenantId, id, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Update customer active/inactive status' })
  async updateStatus(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.customersService.updateCustomerStatus(tenantCtx.tenantId, id, user.id, status);
  }

  @Post(':id/invite')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Dispatch portal invitation email to customer' })
  async inviteCustomer(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string
  ) {
    return this.customersService.inviteCustomer(tenantCtx.tenantId, id, user.id);
  }

  @Post(':id/enable-portal')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Provision or reset self-service customer portal access' })
  async enablePortalAccess(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() body?: { temporaryPassword?: string }
  ) {
    return this.customersService.enablePortalAccess(
      tenantCtx.tenantId,
      id,
      user.id,
      body?.temporaryPassword
    );
  }
}
