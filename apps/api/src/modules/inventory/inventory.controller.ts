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
import { InventoryService } from './inventory.service';
import {
  CreateSparePartDto,
  UpdateSparePartDto,
  CreateStorageLocationDto,
  AdjustStockDto,
  TransferStockDto,
  ConsumePartDto,
  ListPartsQueryDto,
} from './dto/inventory.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(TenantGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/inventory/summary — Summary & KPI Metrics
  // ─────────────────────────────────────────────────────────────────────────
  @Get('summary')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get total valuation, SKU count, and low stock metrics' })
  async getSummary(@CurrentTenant() tenantCtx: TenantContext) {
    return this.inventoryService.getInventorySummary(tenantCtx.tenantId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/inventory/parts — List Spare Parts
  // ─────────────────────────────────────────────────────────────────────────
  @Get('parts')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'List spare parts catalog with multi-location stock' })
  async listParts(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query() query: ListPartsQueryDto,
  ) {
    return this.inventoryService.listParts(tenantCtx.tenantId, query);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/inventory/parts — Create Spare Part
  // ─────────────────────────────────────────────────────────────────────────
  @Post('parts')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Register a new spare part in catalog' })
  async createPart(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateSparePartDto,
  ) {
    return this.inventoryService.createPart(tenantCtx.tenantId, user.id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/inventory/parts/:id — Get Part by ID
  // ─────────────────────────────────────────────────────────────────────────
  @Get('parts/:id')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get part details with stock distribution' })
  async getPartById(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string,
  ) {
    return this.inventoryService.getPartById(tenantCtx.tenantId, id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/inventory/parts/:id — Update Part
  // ─────────────────────────────────────────────────────────────────────────
  @Patch('parts/:id')
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Update spare part details' })
  async updatePart(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateSparePartDto,
  ) {
    return this.inventoryService.updatePart(tenantCtx.tenantId, id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/inventory/locations — List Storage Locations
  // ─────────────────────────────────────────────────────────────────────────
  @Get('locations')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'List warehouses, depots, and service vans' })
  async listLocations(@CurrentTenant() tenantCtx: TenantContext) {
    return this.inventoryService.listLocations(tenantCtx.tenantId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/inventory/locations — Create Storage Location
  // ─────────────────────────────────────────────────────────────────────────
  @Post('locations')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Register a new warehouse or service van' })
  async createLocation(
    @CurrentTenant() tenantCtx: TenantContext,
    @Body() dto: CreateStorageLocationDto,
  ) {
    return this.inventoryService.createLocation(tenantCtx.tenantId, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/inventory/adjust — Restock / Adjust Quantity
  // ─────────────────────────────────────────────────────────────────────────
  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Restock, transfer, or adjust inventory' })
  async adjustStock(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(tenantCtx.tenantId, user.id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/inventory/transfer — Transfer Stock Between Locations
  // ─────────────────────────────────────────────────────────────────────────
  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Transfer stock between warehouse and service vans' })
  async transferStock(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: TransferStockDto,
  ) {
    return this.inventoryService.transferStock(tenantCtx.tenantId, user.id, dto);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/inventory/consume — Allocate / Consume Part
  // ─────────────────────────────────────────────────────────────────────────
  @Post('consume')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Allocate replacement parts to ticket or work order' })
  async consumePart(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: ConsumePartDto,
  ) {
    return this.inventoryService.consumePart(tenantCtx.tenantId, user.id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/inventory/consumptions/by-ticket/:ticketId — Consumptions
  // ─────────────────────────────────────────────────────────────────────────
  @Get('consumptions/by-ticket/:ticketId')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get parts consumed and billing summary for a ticket' })
  async getTicketConsumptions(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('ticketId') ticketId: string,
  ) {
    return this.inventoryService.getTicketConsumptions(tenantCtx.tenantId, ticketId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /api/v1/inventory/consumptions/:id — Void / Revert Consumption
  // ─────────────────────────────────────────────────────────────────────────
  @Delete('consumptions/:id')
  @RequirePermissions(PermissionCode.TENANT_UPDATE)
  @ApiOperation({ summary: 'Void part allocation and restore inventory' })
  async removeConsumption(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
  ) {
    return this.inventoryService.removeConsumption(tenantCtx.tenantId, user.id, id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/inventory/transactions — Audit Ledger Transactions
  // ─────────────────────────────────────────────────────────────────────────
  @Get('transactions')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'List inventory transaction audit history' })
  async listTransactions(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query('partId') partId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.inventoryService.listTransactions(tenantCtx.tenantId, partId, locationId);
  }
}
