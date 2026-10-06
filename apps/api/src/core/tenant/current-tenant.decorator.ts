import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '@kalpak/types';

export const CurrentTenant = createParamDecorator(
  (data: keyof TenantContext | string | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request.tenantContext as TenantContext | undefined;
    if (!tenantContext) return undefined;
    if (data === 'id' || data === 'tenantId') {
      return tenantContext.tenantId;
    }
    return data ? (tenantContext as any)[data] : tenantContext;
  }
);
