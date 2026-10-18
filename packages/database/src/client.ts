import { PrismaClient } from '@prisma/client';

export type TenantScopedPrismaClient = PrismaClient;

/**
 * Creates a Prisma Client configured for connection pooling and optional RLS context binding.
 */
export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });
}

/**
 * Helper to execute a query within a PostgreSQL tenant-isolated transaction with RLS set.
 */
export async function withTenantRls<T>(
  prisma: PrismaClient,
  tenantId: string | null,
  isSuperAdmin: boolean,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (tenantId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
      if (!isUuid) {
        throw new Error(`Invalid tenant ID format for RLS context: "${tenantId}"`);
      }
      // Set the session variable for PostgreSQL RLS
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    }
    if (isSuperAdmin) {
      await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
    }
    return fn(tx as unknown as PrismaClient);
  });
}

export * from '@prisma/client';
