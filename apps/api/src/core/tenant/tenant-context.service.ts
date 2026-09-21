import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from '@kalpak/types';

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  runWithContext<T>(context: TenantContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): TenantContext | undefined {
    return this.storage.getStore();
  }

  getTenantId(): string {
    const ctx = this.storage.getStore();
    if (!ctx?.tenantId) {
      throw new Error('Tenant context is missing or not bound to the current execution stack');
    }
    return ctx.tenantId;
  }

  getUserId(): string {
    const ctx = this.storage.getStore();
    if (!ctx?.userId) {
      throw new Error('User context is missing in tenant execution stack');
    }
    return ctx.userId;
  }

  isSuperAdmin(): boolean {
    return this.storage.getStore()?.isSuperAdmin ?? false;
  }

  getPermissions(): string[] {
    return this.storage.getStore()?.permissions ?? [];
  }
}
