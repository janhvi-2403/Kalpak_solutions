import { logger } from '@kalpak/logger';

export interface BackgroundJob<T = Record<string, unknown>> {
  id: string;
  name: string;
  tenantId?: string;
  payload: T;
  timestamp: Date;
}

export type JobHandler<T = Record<string, unknown>> = (job: BackgroundJob<T>) => Promise<void>;

export class JobRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register<T = Record<string, unknown>>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler);
    logger.info(`[Worker Registry] Registered job handler for "${name}"`);
  }

  async execute(job: BackgroundJob): Promise<void> {
    const handler = this.handlers.get(job.name);
    if (!handler) {
      logger.warn({ jobName: job.name }, 'No registered handler for incoming job');
      return;
    }

    const start = Date.now();
    logger.info({ jobId: job.id, jobName: job.name, tenantId: job.tenantId }, 'Executing background job');
    try {
      await handler(job);
      logger.info({ jobId: job.id, durationMs: Date.now() - start }, 'Background job completed successfully');
    } catch (error) {
      logger.error({ jobId: job.id, error, durationMs: Date.now() - start }, 'Background job execution failed');
      throw error;
    }
  }
}
