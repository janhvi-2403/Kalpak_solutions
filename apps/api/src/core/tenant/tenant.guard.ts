import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantStatus, PermissionCode, SystemRole } from '@kalpak/types';
import { PrismaService } from '../database/prisma.service';
import { SubdomainResolverService } from './subdomain-resolver.service';

export const IS_TENANT_OPTIONAL_KEY = 'isTenantOptional';
export const OptionalTenant = () => SetMetadata(IS_TENANT_OPTIONAL_KEY, true);

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly subdomainResolver: SubdomainResolverService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isOptional = this.reflector.getAllAndOverride<boolean>(IS_TENANT_OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. Check for subdomain tenant
    const { subdomain, tenant: subdomainTenant } = await this.subdomainResolver.resolveFromRequest(request);
    
    if (subdomain && !subdomainTenant) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'TENANT_NOT_FOUND',
        message: `Organization workspace "${subdomain}" does not exist, has been cancelled, or is invalid`,
      });
    }

    if (!user) {
      throw new UnauthorizedException('Authentication required to access tenant-scoped resources');
    }

    const sessionUserTenantId = request.session?.activeTenantId || null;

    // Strict Cross-Tenant Verification (Requirements 5, 6, 7, 8):
    // Never trust URL/subdomain alone. Verify hostnameTenantId === sessionUserTenantId on every protected request.
    if (subdomainTenant) {
      const hostnameTenantId = subdomainTenant.id;

      if (!sessionUserTenantId) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          code: 'FORBIDDEN_NO_TENANT_SESSION',
          message: 'Active session does not have an active tenant workspace assigned',
        });
      }

      if (hostnameTenantId !== sessionUserTenantId) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          code: 'FORBIDDEN_CROSS_TENANT',
          message: `Cross-tenant access denied. Your session belongs to a different workspace and cannot access "${subdomainTenant.name}" (${subdomainTenant.slug})`,
          authorizedTenantId: sessionUserTenantId,
          requestedTenantId: hostnameTenantId,
          requestedSlug: subdomainTenant.slug,
        });
      }
    }

    // Determine target tenant ID (session user tenant ID or subdomain tenant ID)
    const tenantId = subdomainTenant?.id || sessionUserTenantId || request.headers['x-tenant-id'];

    if (isOptional && !tenantId) {
      return true;
    }

    if (!tenantId) {
      throw new ForbiddenException('Active tenant context is required for this operation');
    }

    // 2. Verify tenant exists and is active
    const tenant = subdomainTenant || (await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, status: true, deletedAt: true },
    }));

    if (!tenant || tenant.deletedAt !== null) {
      throw new ForbiddenException('Requested tenant organization does not exist or has been deleted');
    }

    if (tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.CANCELLED) {
      throw new ForbiddenException(`Tenant organization access is restricted (Status: ${tenant.status})`);
    }

    // 3. Verify user is an active member of this specific tenant (Requirements 9, 10).
    // Super Admins remain platform-level and do NOT accidentally inherit tenant access.
    // To access a tenant workspace, an explicit membership is strictly required.
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        uq_membership_tenant_user: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      if (subdomainTenant) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          code: 'FORBIDDEN_CROSS_TENANT',
          message: `You do not belong to organization "${subdomainTenant.name}" (${subdomainTenant.slug})`,
        });
      }
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'FORBIDDEN_NOT_MEMBER',
        message: 'You do not belong to the requested tenant organization',
      });
    }

    // Attach verified tenant membership details and resolved tenant ID to request
    request.resolvedTenantId = tenant.id;
    request.resolvedTenant = tenant;
    request.tenantMembership = membership;
    if (user.isSuperAdmin) {
      request.tenantPermissions = Object.values(PermissionCode);
    } else {
      const dbPerms = membership.role.permissions.map((rp) => rp.permission.code);
      if (membership.role.name === SystemRole.CLIENT_ADMIN && dbPerms.length === 0) {
        request.tenantPermissions = [
          PermissionCode.TENANT_READ,
          PermissionCode.TENANT_UPDATE,
          PermissionCode.TENANT_SETTINGS,
          PermissionCode.USER_READ,
          PermissionCode.USER_CREATE,
          PermissionCode.USER_UPDATE,
          PermissionCode.USER_DELETE,
          PermissionCode.ROLE_ASSIGN,
          PermissionCode.ROLE_MANAGE,
          PermissionCode.TICKET_CREATE,
          PermissionCode.TICKET_READ,
          PermissionCode.TICKET_UPDATE,
          PermissionCode.TICKET_ASSIGN,
          PermissionCode.TICKET_RESOLVE,
          PermissionCode.CUSTOMER_READ,
          PermissionCode.CUSTOMER_CREATE,
          PermissionCode.CUSTOMER_UPDATE,
          PermissionCode.PRODUCT_READ,
          PermissionCode.PRODUCT_MANAGE,
          PermissionCode.SERVICE_READ,
          PermissionCode.SERVICE_MANAGE,
          PermissionCode.REPORT_VIEW,
          PermissionCode.REPORT_EXPORT,
          PermissionCode.AUDIT_READ,
          PermissionCode.BILLING_VIEW,
          PermissionCode.BILLING_MANAGE,
        ];
      } else if (membership.role.name === SystemRole.DEPARTMENT_ADMIN && dbPerms.length === 0) {
        request.tenantPermissions = [
          PermissionCode.TENANT_READ,
          PermissionCode.USER_READ,
          PermissionCode.TICKET_CREATE,
          PermissionCode.TICKET_READ,
          PermissionCode.TICKET_UPDATE,
          PermissionCode.TICKET_ASSIGN,
          PermissionCode.TICKET_RESOLVE,
          PermissionCode.CUSTOMER_READ,
          PermissionCode.PRODUCT_READ,
          PermissionCode.SERVICE_READ,
          PermissionCode.REPORT_VIEW,
        ];
      } else {
        request.tenantPermissions = dbPerms;
      }
    }

    return true;
  }
}
