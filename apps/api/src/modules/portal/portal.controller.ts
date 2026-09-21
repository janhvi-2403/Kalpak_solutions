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
import { PortalService } from './portal.service';
import { RaisePortalTicketDto, PortalTicketQueryDto } from './dto/portal.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { Public } from '../../core/auth/public.decorator';

@ApiTags('Customer Portal')
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * Public info for tenant branding on portal login page
   */
  @Public()
  @Get('tenant/:slug/info')
  @ApiOperation({ summary: 'Get public tenant metadata for portal branding' })
  async getPublicTenantInfo(@Param('slug') slug: string) {
    return this.portalService.getPublicTenantInfo(slug);
  }

  /**
   * Authenticated portal customer profile
   */
  @Get('me')
  @UseGuards(TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated customer profile and organization details' })
  async getProfile(
    @CurrentUser() user: UserPrincipal,
    @CurrentTenant() tenantCtx: TenantContext
  ) {
    return this.portalService.getPortalProfile(user.id, tenantCtx.tenantId);
  }

  /**
   * Dashboard statistics for the customer
   */
  @Get('stats')
  @UseGuards(TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer dashboard stats counters' })
  async getStats(
    @CurrentUser() user: UserPrincipal,
    @CurrentTenant() tenantCtx: TenantContext
  ) {
    return this.portalService.getDashboardStats(user.id, tenantCtx.tenantId);
  }

  /**
   * List customer tickets
   */
  @Get('tickets')
  @UseGuards(TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List customer service tickets with filtering' })
  async listTickets(
    @CurrentUser() user: UserPrincipal,
    @CurrentTenant() tenantCtx: TenantContext,
    @Query() query: PortalTicketQueryDto
  ) {
    return this.portalService.listCustomerTickets(user.id, tenantCtx.tenantId, query);
  }

  /**
   * Get single ticket detail
   */
  @Get('tickets/:id')
  @UseGuards(TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticket detail with timeline, work orders and spare parts' })
  async getTicketDetail(
    @CurrentUser() user: UserPrincipal,
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string
  ) {
    return this.portalService.getCustomerTicketById(user.id, tenantCtx.tenantId, id);
  }

  /**
   * Customer raises a new ticket
   */
  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer self-service ticket creation' })
  async raiseTicket(
    @CurrentUser() user: UserPrincipal,
    @CurrentTenant() tenantCtx: TenantContext,
    @Body() dto: RaisePortalTicketDto
  ) {
    return this.portalService.raiseTicket(user.id, tenantCtx.tenantId, dto);
  }

  /**
   * List customer assets / machines
   */
  @Get('assets')
  @UseGuards(TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List customer registered machinery & assets' })
  async listAssets(
    @CurrentUser() user: UserPrincipal,
    @CurrentTenant() tenantCtx: TenantContext
  ) {
    return this.portalService.listCustomerAssets(user.id, tenantCtx.tenantId);
  }

  /**
   * List customer AMC contracts and upcoming PM schedules
   */
  @Get('contracts')
  @UseGuards(TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List customer AMC contracts and upcoming PM schedules' })
  async listContracts(
    @CurrentUser() user: UserPrincipal,
    @CurrentTenant() tenantCtx: TenantContext
  ) {
    return this.portalService.getCustomerContracts(user.id, tenantCtx.tenantId);
  }
}
