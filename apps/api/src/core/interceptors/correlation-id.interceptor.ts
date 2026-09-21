import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { runWithLogContext, getLogContext } from '@kalpak/logger';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      randomUUID();

    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    const existingCtx = getLogContext() || {};
    return new Observable((subscriber) => {
      runWithLogContext(
        {
          ...existingCtx,
          correlationId,
        },
        () => {
          next.handle().subscribe(subscriber);
        }
      );
    });
  }
}
