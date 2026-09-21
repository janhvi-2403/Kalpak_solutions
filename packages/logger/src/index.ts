import pino, { Logger, LoggerOptions } from 'pino';
import { REDACTION_PATHS, REDACTION_CENSOR } from './redaction';
import { getLogContext, runWithLogContext, logContextStorage, LogContext } from './context';

export function createLogger(options?: Partial<LoggerOptions>): Logger {
  const isPretty = process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV === 'development';
  const level = process.env.LOG_LEVEL || 'info';

  const defaultOptions: LoggerOptions = {
    level,
    redact: {
      paths: REDACTION_PATHS,
      censor: REDACTION_CENSOR,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    mixin() {
      const ctx = getLogContext();
      if (!ctx) return {};
      return {
        correlationId: ctx.correlationId,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      };
    },
    transport: isPretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    ...options,
  };

  return pino(defaultOptions);
}

export const logger = createLogger();

export { runWithLogContext, getLogContext, logContextStorage, LogContext };
export * from './redaction';
