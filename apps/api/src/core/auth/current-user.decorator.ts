import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPrincipal } from '@kalpak/types';

export const CurrentUser = createParamDecorator(
  (data: keyof UserPrincipal | string | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data as keyof UserPrincipal] : user;
  }
);
