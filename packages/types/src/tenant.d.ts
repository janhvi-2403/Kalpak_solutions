import { SystemRole, TenantStatus } from './enums';
export interface TenantContext {
    tenantId: string;
    userId: string;
    roles: string[];
    permissions: string[];
    isSuperAdmin: boolean;
    correlationId?: string;
}
export interface TenantSummary {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface TenantMembershipInfo {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: SystemRole | string;
    permissions: string[];
}
//# sourceMappingURL=tenant.d.ts.map