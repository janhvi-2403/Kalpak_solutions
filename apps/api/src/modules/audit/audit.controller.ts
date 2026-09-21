import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';
import { PermissionCode, TenantContext } from '@kalpak/types';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { TenantGuard } from '../../core/tenant/tenant.guard';

@ApiTags('Audit & Compliance')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(PermissionCode.AUDIT_READ)
  @ApiOperation({ summary: 'Retrieve paginated audit logs for the active tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAuditLogs(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20;

    return this.auditService.getTenantAuditLogs(tenantCtx.tenantId, pageNum, limitNum);
  }
}
