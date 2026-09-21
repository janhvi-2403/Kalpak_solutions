import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from '../src/core/rbac/permissions.guard';
import { PermissionCode } from '@kalpak/types';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user: unknown, tenantPermissions: string[] = []): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          tenantPermissions,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ id: 'user-1' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow Super Admin access regardless of specific permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PermissionCode.TICKET_DELETE]);
    const context = createMockContext({ id: 'super-admin', isSuperAdmin: true });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has all required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PermissionCode.TICKET_READ, PermissionCode.TICKET_CREATE]);

    const context = createMockContext(
      { id: 'user-1', isSuperAdmin: false },
      [PermissionCode.TICKET_READ, PermissionCode.TICKET_CREATE, PermissionCode.CUSTOMER_READ]
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user is missing any required permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PermissionCode.TICKET_READ, PermissionCode.TICKET_DELETE]);

    const context = createMockContext(
      { id: 'user-1', isSuperAdmin: false },
      [PermissionCode.TICKET_READ] // missing TICKET_DELETE
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
