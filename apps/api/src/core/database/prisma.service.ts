import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { logger } from '@kalpak/logger';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
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

  async onModuleInit() {
    try {
      await this.$connect();
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to PostgreSQL database');
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    logger.info('Database connection closed cleanly');
  }

  /**
   * Executes a database operation within a PostgreSQL transaction bound to a specific tenant ID for RLS.
   */
  async withTenantContext<T>(
    tenantId: string | null,
    isSuperAdmin: boolean,
    operation: (tx: PrismaService) => Promise<T>
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      if (tenantId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      }
      if (isSuperAdmin) {
        await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
      }
      return operation(tx as unknown as PrismaService);
    });
  }
}
