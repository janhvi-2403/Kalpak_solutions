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
    let message = 'An unexpected server error occurred. Please try again.';
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
      // Internal or unhandled exceptions
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'Internal Server Error';
      message = 'An unexpected server error occurred. Please try again.';
    }

    // Security Sanitization: Never leak Prisma syntax, internal file paths or stack traces
    if (
      message.includes('prisma') ||
      message.includes('Prisma') ||
      message.includes('invocation') ||
      message.includes('findFirst') ||
      message.includes('findUnique') ||
      message.includes('findFirstOrThrow') ||
      message.includes('C:\\') ||
      message.includes('/dist/') ||
      message.includes('node_modules') ||
      message.includes('Require stack')
    ) {
      message = 'An error occurred while processing your request. Please try again.';
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

    // Log the error internally with full diagnostic context (server-side only)
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
