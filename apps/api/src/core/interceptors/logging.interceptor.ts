import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { logger } from '@kalpak/logger';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { correlationId?: string }>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          logger.info(
            {
              method,
              url: originalUrl,
              statusCode,
              durationMs: duration,
              ip,
              userAgent,
            },
            `HTTP ${method} ${originalUrl} ${statusCode} - ${duration}ms`
          );
        },
      })
    );
  }
}
