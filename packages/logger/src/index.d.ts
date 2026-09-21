import pino, { Logger, LoggerOptions } from 'pino';
import { getLogContext, runWithLogContext, logContextStorage, LogContext } from './context';
export declare function createLogger(options?: Partial<LoggerOptions>): Logger;
export declare const logger: pino.Logger;
export { runWithLogContext, getLogContext, logContextStorage, LogContext };
export * from './redaction';
//# sourceMappingURL=index.d.ts.map