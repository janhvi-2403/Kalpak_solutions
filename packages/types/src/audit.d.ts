import { AuditEventType } from './enums';
export interface CreateAuditLogParams {
    tenantId?: string | null;
    actorId?: string | null;
    eventType: AuditEventType;
    resourceType: string;
    resourceId?: string | null;
    action: string;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}
export interface AuditLogEntry {
    id: string;
    tenantId: string | null;
    actorId: string | null;
    eventType: AuditEventType;
    resourceType: string;
    resourceId: string | null;
    action: string;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}
//# sourceMappingURL=audit.d.ts.map