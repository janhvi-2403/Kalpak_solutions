import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  [key: string]: unknown;
}

export const logContextStorage = new AsyncLocalStorage<LogContext>();

export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  return logContextStorage.run(context, fn);
}

export function getLogContext(): LogContext | undefined {
  return logContextStorage.getStore();
}
