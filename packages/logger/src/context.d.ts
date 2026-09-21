import { AsyncLocalStorage } from 'async_hooks';
export interface LogContext {
    correlationId?: string;
    tenantId?: string;
    userId?: string;
    [key: string]: unknown;
}
export declare const logContextStorage: AsyncLocalStorage<LogContext>;
export declare function runWithLogContext<T>(context: LogContext, fn: () => T): T;
export declare function getLogContext(): LogContext | undefined;
//# sourceMappingURL=context.d.ts.map