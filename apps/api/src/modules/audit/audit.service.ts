import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateAuditLogParams, AuditLogEntry, PaginatedResult } from '@kalpak/types';
import { logger } from '@kalpak/logger';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a security or operational event to the immutable audit log table.
   */
  async record(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId: params.tenantId || null,
          actorId: params.actorId || null,
          eventType: params.eventType,
          resourceType: params.resourceType,
          resourceId: params.resourceId || null,
          action: params.action,
          metadata: (params.metadata || {}) as Prisma.InputJsonValue,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      // Audit failure should be logged with high severity, but not necessarily crash the business transaction
      logger.error(
        { error, eventType: params.eventType, tenantId: params.tenantId },
        'Failed to record audit event'
      );
    }
  }

  /**
   * Queries audit events for a specific tenant with pagination.
   */
  async getTenantAuditLogs(
    tenantId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<AuditLogEntry>> {
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      this.prisma.auditEvent.count({
        where: { tenantId },
      }),
      this.prisma.auditEvent.findMany({
        where: { tenantId },
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: records as unknown as AuditLogEntry[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }
}
