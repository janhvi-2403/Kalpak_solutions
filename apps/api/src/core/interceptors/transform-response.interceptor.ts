import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StandardApiResponse } from '@kalpak/types';
import { Request } from 'express';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, StandardApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<StandardApiResponse<T> | T> {
    const request = context.switchToHttp().getRequest<Request & { correlationId?: string }>();

    return next.handle().pipe(
      map((data) => {
        // If data is already an API response or a raw stream/buffer, pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            correlationId: request.correlationId,
          },
        };
      })
    );
  }
}
