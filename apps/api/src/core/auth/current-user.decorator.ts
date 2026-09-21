import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPrincipal } from '@kalpak/types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPrincipal | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
