import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import {
  CreateWorkOrderDto,
  UpdateChecklistItemDto,
  CompleteWorkOrderDto,
  WorkOrderListQueryDto,
} from './dto/work-order.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('WorkOrders')
@ApiBearerAuth()
@Controller('work-orders')
@UseGuards(TenantGuard, PermissionsGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/work-orders — List Work Orders
  // ─────────────────────────────────────────────────────────────────────────
  @Get()
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'List field service work orders with filters' })
  async listWorkOrders(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query() query: WorkOrderListQueryDto,
  ) {
    return this.workOrdersService.listWorkOrders(tenantCtx.tenantId, query);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/work-orders/by-ticket/:ticketId — Get by Ticket
  // ─────────────────────────────────────────────────────────────────────────
  @Get('by-ticket/:ticketId')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get all work orders associated with a service ticket' })
  async getByTicket(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('ticketId') ticketId: string,
  ) {
    return this.workOrdersService.getWorkOrdersByTicket(tenantCtx.tenantId, ticketId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/work-orders/:id — Get Details
  // ─────────────────────────────────────────────────────────────────────────
  @Get(':id')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get full work order details with checklist items' })
  async getById(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string,
  ) {
    return this.workOrdersService.getWorkOrderById(tenantCtx.tenantId, id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/work-orders — Create Work Order
  // ─────────────────────────────────────────────────────────────────────────
  @Post()
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Schedule a field service work order with inspection checklist' })
  async createWorkOrder(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.workOrdersService.createWorkOrder(tenantCtx.tenantId, user.id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/work-orders/:id/start — Start Work
  // ─────────────────────────────────────────────────────────────────────────
  @Patch(':id/start')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Technician starts execution on work order' })
  async startWork(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
  ) {
    return this.workOrdersService.startWork(tenantCtx.tenantId, id, user.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/work-orders/:id/checklist/:itemId — Update Checklist Task
  // ─────────────────────────────────────────────────────────────────────────
  @Patch(':id/checklist/:itemId')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Update verification status or reading on a checklist item' })
  async updateChecklistItem(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.workOrdersService.updateChecklistItem(
      tenantCtx.tenantId,
      id,
      itemId,
      user.id,
      dto,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/work-orders/:id/complete — Complete with Customer Sign-Off
  // ─────────────────────────────────────────────────────────────────────────
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Complete work order, record customer digital sign-off and rating' })
  async completeWorkOrder(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: CompleteWorkOrderDto,
  ) {
    return this.workOrdersService.completeWorkOrder(
      tenantCtx.tenantId,
      id,
      user.id,
      dto,
    );
  }
}
