import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { TenantContext } from '@kalpak/types';
import { runWithLogContext, getLogContext } from '@kalpak/logger';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantContextService: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const session = request.session;
    const tenantId = session?.activeTenantId || request.headers['x-tenant-id'];

    const tenantContext: TenantContext = {
      tenantId: tenantId || '',
      userId: user?.id || '',
      roles: request.tenantMembership ? [request.tenantMembership.role.name] : [],
      permissions: request.tenantPermissions || [],
      isSuperAdmin: user?.isSuperAdmin || false,
      correlationId: request.correlationId,
    };

    request.tenantContext = tenantContext;

    // Update logger context with tenant and user IDs
    const currentLogCtx = getLogContext() || {};
    return new Observable((subscriber) => {
      runWithLogContext(
        {
          ...currentLogCtx,
          tenantId: tenantContext.tenantId,
          userId: tenantContext.userId,
        },
        () => {
          this.tenantContextService.runWithContext(tenantContext, () => {
            next.handle().subscribe(subscriber);
          });
        }
      );
    });
  }
}
