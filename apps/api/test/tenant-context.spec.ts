import { TenantContextService } from '../src/core/tenant/tenant-context.service';
import { TenantContext } from '@kalpak/types';

describe('TenantContextService (AsyncLocalStorage Isolation)', () => {
  let service: TenantContextService;

  beforeEach(() => {
    service = new TenantContextService();
  });

  it('should isolate tenant context between concurrent asynchronous operations', async () => {
    const tenantA: TenantContext = {
      tenantId: 'tenant-a-uuid',
      userId: 'user-a-uuid',
      roles: ['CLIENT_ADMIN'],
      permissions: ['ticket:read', 'ticket:create'],
      isSuperAdmin: false,
    };

    const tenantB: TenantContext = {
      tenantId: 'tenant-b-uuid',
      userId: 'user-b-uuid',
      roles: ['SUPPORT_EMPLOYEE'],
      permissions: ['ticket:read'],
      isSuperAdmin: false,
    };

    const taskA = () =>
      new Promise<string>((resolve) => {
        service.runWithContext(tenantA, async () => {
          await new Promise((r) => setTimeout(r, 20));
          resolve(service.getTenantId());
        });
      });

    const taskB = () =>
      new Promise<string>((resolve) => {
        service.runWithContext(tenantB, async () => {
          await new Promise((r) => setTimeout(r, 10));
          resolve(service.getTenantId());
        });
      });

    const [resultA, resultB] = await Promise.all([taskA(), taskB()]);

    expect(resultA).toBe('tenant-a-uuid');
    expect(resultB).toBe('tenant-b-uuid');
  });

  it('should throw an error when accessing tenant context outside runWithContext', () => {
    expect(() => service.getTenantId()).toThrow(
      'Tenant context is missing or not bound to the current execution stack'
    );
  });
});
