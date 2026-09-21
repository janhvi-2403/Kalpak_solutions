import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { SystemRole } from '@kalpak/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(SystemRole | string)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super Admin passes role checks
    if (user?.isSuperAdmin) {
      return true;
    }

    const userRole = request.tenantMembership?.role?.name;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException(`Role not authorized. Required: [${requiredRoles.join(', ')}]`);
    }

    return true;
  }
}
