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

export const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'app',
  'admin',
  'superadmin',
  'auth',
  'mail',
  'support',
  'status',
  'portal',
  'dashboard',
  'billing',
  'docs',
  'assets',
  'static',
  'cdn',
  'ws',
  'webhook',
  'webhooks',
  'localhost',
] as const;

export type ReservedSubdomain = (typeof RESERVED_SUBDOMAINS)[number];

export interface TenantSubdomainInfo {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  settings?: Record<string, any>;
  logoUrl?: string;
  primaryColor?: string;
}

