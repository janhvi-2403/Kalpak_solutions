import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logger } from '@kalpak/logger';
import { ApiErrorResponse } from '@kalpak/types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal server error occurred';
    let error = 'Internal Server Error';
    let details: ApiErrorResponse['details'] = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj['message'] as string) || exception.message;
        error = (resObj['error'] as string) || exception.name;

        // Handle class-validator validation array error
        if (Array.isArray(resObj['message'])) {
          const validationMessages = resObj['message'] as string[];
          message = validationMessages.join(' • ');
          details = validationMessages.map((msg) => ({
            message: msg,
          }));
        }
      }
    } else if (exception instanceof Error) {
      // Unhandled system exceptions
      if (process.env.NODE_ENV === 'development') {
        message = exception.message;
      }
    }

    const correlationId = request.correlationId || (request.headers['x-correlation-id'] as string);

    const errorPayload: ApiErrorResponse = {
      success: false,
      statusCode: status,
      error,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    // Log the error
    if (status >= 500) {
      logger.error(
        {
          err: exception,
          path: request.url,
          method: request.method,
          correlationId,
          statusCode: status,
        },
        `Internal Server Error [${status}] on ${request.method} ${request.url}`
      );
    } else {
      logger.warn(
        {
          path: request.url,
          method: request.method,
          correlationId,
          statusCode: status,
          message,
        },
        `Client Request Error [${status}] on ${request.method} ${request.url}: ${message}`
      );
    }

    response.status(status).json(errorPayload);
  }
}
