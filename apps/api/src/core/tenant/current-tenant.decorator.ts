import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '@kalpak/types';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext;
  }
);
