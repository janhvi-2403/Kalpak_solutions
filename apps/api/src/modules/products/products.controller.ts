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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateCustomerAssetDto, UpdateCustomerAssetDto } from './dto/customer-asset.dto';
import { CreateServiceCatalogDto, UpdateServiceCatalogDto } from './dto/service-catalog.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Products & Equipment')
@ApiBearerAuth()
@Controller()
@UseGuards(TenantGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // --------------------------------------------------------------------------
  // Products Endpoints
  // --------------------------------------------------------------------------

  @Get('products')
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @ApiOperation({ summary: 'List all products in the catalog' })
  async listProducts(@CurrentTenant() tenantCtx: TenantContext) {
    return this.productsService.listProducts(tenantCtx.tenantId);
  }

  @Get('products/:id')
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @ApiOperation({ summary: 'Get product details by ID' })
  async getProduct(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.productsService.getProduct(tenantCtx.tenantId, id);
  }

  @Post('products')
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Add a new product to the catalog' })
  async createProduct(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateProductDto
  ) {
    return this.productsService.createProduct(tenantCtx.tenantId, user.id, dto);
  }

  @Patch('products/:id')
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Update product catalog entry' })
  async updateProduct(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.productsService.updateProduct(tenantCtx.tenantId, id, user.id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Soft-delete a product' })
  async deleteProduct(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string
  ) {
    return this.productsService.deleteProduct(tenantCtx.tenantId, id, user.id);
  }

  // --------------------------------------------------------------------------
  // Customer Installed Assets Endpoints
  // --------------------------------------------------------------------------

  @Get('assets')
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @ApiOperation({ summary: 'List all customer installed assets/machines with search' })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listAssets(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string
  ) {
    return this.productsService.listAssets(tenantCtx.tenantId, customerId, search);
  }

  @Get('assets/:id')
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @ApiOperation({ summary: 'Get asset details by ID' })
  async getAsset(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.productsService.getAsset(tenantCtx.tenantId, id);
  }

  @Post('assets')
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Register serialized customer machine/equipment' })
  async createAsset(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateCustomerAssetDto
  ) {
    return this.productsService.createAsset(tenantCtx.tenantId, user.id, dto);
  }

  @Patch('assets/:id')
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Update customer asset status or warranty' })
  async updateAsset(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAssetDto
  ) {
    return this.productsService.updateAsset(tenantCtx.tenantId, id, user.id, dto);
  }

  @Delete('assets/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Soft-delete a customer asset' })
  async deleteAsset(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string
  ) {
    return this.productsService.deleteAsset(tenantCtx.tenantId, id, user.id);
  }

  // --------------------------------------------------------------------------
  // Services Master Catalog Endpoints
  // --------------------------------------------------------------------------

  @Get('services')
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @ApiOperation({ summary: 'List all service catalog items (Installation, Repair, Maintenance, etc.)' })
  async listServices(@CurrentTenant() tenantCtx: TenantContext) {
    return this.productsService.listServices(tenantCtx.tenantId);
  }

  @Get('services/:id')
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @ApiOperation({ summary: 'Get service catalog entry by ID' })
  async getService(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.productsService.getService(tenantCtx.tenantId, id);
  }

  @Post('services')
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Create a new service catalog item' })
  async createService(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateServiceCatalogDto
  ) {
    return this.productsService.createService(tenantCtx.tenantId, user.id, dto);
  }

  @Patch('services/:id')
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Update a service catalog item' })
  async updateService(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateServiceCatalogDto
  ) {
    return this.productsService.updateService(tenantCtx.tenantId, id, user.id, dto);
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Soft-delete a service catalog item' })
  async deleteService(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string
  ) {
    return this.productsService.deleteService(tenantCtx.tenantId, id, user.id);
  }
}
