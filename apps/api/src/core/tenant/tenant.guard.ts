import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantStatus } from '@kalpak/types';
import { PrismaService } from '../database/prisma.service';

export const IS_TENANT_OPTIONAL_KEY = 'isTenantOptional';
export const OptionalTenant = () => SetMetadata(IS_TENANT_OPTIONAL_KEY, true);

import { SetMetadata } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isOptional = this.reflector.getAllAndOverride<boolean>(IS_TENANT_OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.session?.activeTenantId || request.headers['x-tenant-id'];

    if (isOptional && !tenantId) {
      return true;
    }

    if (!user) {
      throw new UnauthorizedException('Authentication required to access tenant-scoped resources');
    }

    if (!tenantId) {
      if (user.isSuperAdmin) {
        return true; // Super admins can operate across tenants
      }
      throw new ForbiddenException('Active tenant context is required for this operation');
    }

    // Verify tenant exists and is active
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, status: true, deletedAt: true },
    });

    if (!tenant || tenant.deletedAt !== null) {
      throw new ForbiddenException('Requested tenant organization does not exist or has been deleted');
    }

    if (tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.CANCELLED) {
      throw new ForbiddenException(`Tenant organization access is restricted (Status: ${tenant.status})`);
    }

    // If user is super admin, access is granted
    if (user.isSuperAdmin) {
      return true;
    }

    // Verify user is an active member of this tenant
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        uq_membership_tenant_user: {
          tenantId,
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
      throw new ForbiddenException('You do not belong to the requested tenant organization');
    }

    // Attach verified tenant membership details to request
    request.tenantMembership = membership;
    request.tenantPermissions = membership.role.permissions.map((rp) => rp.permission.code);

    return true;
  }
}
