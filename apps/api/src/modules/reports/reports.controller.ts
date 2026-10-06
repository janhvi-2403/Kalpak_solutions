import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(TenantGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('tickets')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Get aggregated ticket summary report with breakdowns' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['status', 'priority', 'department', 'employee', 'customer', 'product', 'service'],
  })
  async getTicketSummaryReport(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: any,
  ) {
    const tenantId = typeof tenantCtx === 'object' ? tenantCtx.tenantId : String(tenantCtx);
    return this.reportsService.getTicketSummaryReport(tenantId, {
      startDate,
      endDate,
      groupBy,
    });
  }

  @Get('tickets/export-csv')
  @RequirePermissions(PermissionCode.TENANT_READ)
  @ApiOperation({ summary: 'Export ticket report as downloadable CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="tickets-report.csv"')
  async exportTicketsCsv(
    @CurrentTenant() tenantCtx: TenantContext,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = typeof tenantCtx === 'object' ? tenantCtx.tenantId : String(tenantCtx);
    const csvContent = await this.reportsService.exportTicketsCsv(tenantId, {
      startDate,
      endDate,
    });
    return res.send(csvContent);
  }
}
