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
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CreateCustomerBranchDto,
  UpdateCustomerBranchDto,
  CreateCustomerContactDto,
  UpdateCustomerContactDto,
  AssignCustomerUserDto,
  LinkCustomerAssetDto,
} from './dto/customer.dto';
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
  @ApiOperation({ summary: 'List all client customers with search, filter, and pagination support' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['ALL', 'ACTIVE', 'INACTIVE'] })
  @ApiQuery({ name: 'customerType', required: false, enum: ['ALL', 'INDIVIDUAL', 'BUSINESS_PARTNER', 'CORPORATE'] })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async listCustomers(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerType') customerType?: string,
    @Query('branchId') branchId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    return this.customersService.listCustomers(tenantCtx.tenantId, {
      search,
      status,
      customerType,
      branchId,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'Get customer summary statistics (total, active, individual, business, corporate, open tickets)' })
  async getCustomerStats(@CurrentTenant() tenantCtx: TenantContext) {
    return this.customersService.getStats(tenantCtx.tenantId);
  }

  @Get('export')
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'Export customers dataset' })
  async exportCustomers(@CurrentTenant() tenantCtx: TenantContext) {
    return this.customersService.exportCustomers(tenantCtx.tenantId);
  }

  @Post('import')
  @RequirePermissions(PermissionCode.CUSTOMER_CREATE)
  @ApiOperation({ summary: 'Bulk import customer records' })
  async importCustomers(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() records: CreateCustomerDto[]
  ) {
    return this.customersService.importCustomers(tenantCtx.tenantId, user.id, records);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'Get customer details including branches, contacts, authorized users, equipment, and tickets' })
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
  @ApiOperation({ summary: 'Soft-delete or deactivate a customer account' })
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

  // ---------------------------------------------------------------------------
  // Branches
  // ---------------------------------------------------------------------------
  @Get(':id/branches')
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'List customer branches' })
  async listBranches(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.customersService.listBranches(tenantCtx.tenantId, id);
  }

  @Post(':id/branches')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Create a new branch for customer' })
  async createBranch(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: CreateCustomerBranchDto
  ) {
    return this.customersService.createBranch(tenantCtx.tenantId, id, user.id, dto);
  }

  @Patch(':id/branches/:branchId')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Update a branch for customer' })
  async updateBranch(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateCustomerBranchDto
  ) {
    return this.customersService.updateBranch(tenantCtx.tenantId, id, branchId, user.id, dto);
  }

  @Delete(':id/branches/:branchId')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Delete a branch for customer' })
  async deleteBranch(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Param('branchId') branchId: string
  ) {
    return this.customersService.deleteBranch(tenantCtx.tenantId, id, branchId, user.id);
  }

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------
  @Get(':id/contacts')
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'List customer contacts' })
  async listContacts(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.customersService.listContacts(tenantCtx.tenantId, id);
  }

  @Post(':id/contacts')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Create a new contact for customer' })
  async createContact(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: CreateCustomerContactDto
  ) {
    return this.customersService.createContact(tenantCtx.tenantId, id, user.id, dto);
  }

  @Patch(':id/contacts/:contactId')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Update a contact for customer' })
  async updateContact(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateCustomerContactDto
  ) {
    return this.customersService.updateContact(tenantCtx.tenantId, id, contactId, user.id, dto);
  }

  @Delete(':id/contacts/:contactId')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Delete a contact for customer' })
  async deleteContact(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Param('contactId') contactId: string
  ) {
    return this.customersService.deleteContact(tenantCtx.tenantId, id, contactId, user.id);
  }

  // ---------------------------------------------------------------------------
  // Portal Users
  // ---------------------------------------------------------------------------
  @Get(':id/portal-users')
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'List authorized customer portal users' })
  async listPortalUsers(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.customersService.listPortalUsers(tenantCtx.tenantId, id);
  }

  @Post(':id/portal-users')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Authorize a portal user for this customer' })
  async assignPortalUser(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: AssignCustomerUserDto
  ) {
    return this.customersService.assignPortalUser(tenantCtx.tenantId, id, user.id, dto);
  }

  @Delete(':id/portal-users/:portalUserId')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Revoke portal user authorization' })
  async removePortalUser(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Param('portalUserId') portalUserId: string
  ) {
    return this.customersService.removePortalUser(tenantCtx.tenantId, id, portalUserId, user.id);
  }

  // ---------------------------------------------------------------------------
  // Assets & Tickets
  // ---------------------------------------------------------------------------
  @Post(':id/assets')
  @RequirePermissions(PermissionCode.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Link an equipment/vehicle asset to customer' })
  async linkAsset(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: LinkCustomerAssetDto
  ) {
    return this.customersService.linkAsset(tenantCtx.tenantId, id, user.id, dto);
  }

  @Get(':id/tickets')
  @RequirePermissions(PermissionCode.CUSTOMER_READ)
  @ApiOperation({ summary: 'Get ticket history for customer' })
  async getCustomerTickets(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.customersService.getCustomerTickets(tenantCtx.tenantId, id);
  }

  // ---------------------------------------------------------------------------
  // Invitation & Compatibility
  // ---------------------------------------------------------------------------
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
