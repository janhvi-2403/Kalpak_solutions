import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

export interface RateLimitOptions {
  points: number; // Maximum number of requests allowed
  durationSeconds: number; // Time window in seconds
}

export const RATE_LIMIT_KEY = 'rateLimitOptions';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

interface RateLimitRecord {
  timestamps: number[];
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly hits = new Map<string, RateLimitRecord>();
  private lastCleanup = Date.now();

  constructor(private readonly reflector: Reflector) {}

  /**
   * Safely extracts the real client IP address behind Render/reverse proxy.
   */
  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      if (typeof forwardedStr === 'string') {
        const firstIp = forwardedStr.split(',')[0]?.trim();
        if (firstIp && !firstIp.startsWith('10.') && !firstIp.startsWith('172.16.') && !firstIp.startsWith('192.168.')) {
          return firstIp;
        }
      }
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Purges expired entries every 5 minutes to prevent memory leaks.
   */
  private purgeStaleEntries() {
    const now = Date.now();
    if (now - this.lastCleanup > 5 * 60 * 1000) {
      this.lastCleanup = now;
      for (const [key, record] of this.hits.entries()) {
        const fresh = record.timestamps.filter((ts) => now - ts < 3600 * 1000);
        if (fresh.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, { timestamps: fresh });
        }
      }
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    this.purgeStaleEntries();

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const ip = this.extractClientIp(request);
    const route = request.route?.path || request.path || 'auth';
    const key = `${ip}:${route}`;

    const now = Date.now();
    const windowStart = now - options.durationSeconds * 1000;

    let record = this.hits.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.hits.set(key, record);
    }

    // Retain only timestamps within the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= options.points) {
      const oldestHit = record.timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestHit + options.durationSeconds * 1000 - now) / 1000));
      
      response.setHeader('Retry-After', String(retryAfterSeconds));
      response.setHeader('X-RateLimit-Limit', String(options.points));
      response.setHeader('X-RateLimit-Remaining', '0');

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many attempts from this IP. Please try again after ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    record.timestamps.push(now);
    const remaining = options.points - record.timestamps.length;
    response.setHeader('X-RateLimit-Limit', String(options.points));
    response.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));

    return true;
  }
}
