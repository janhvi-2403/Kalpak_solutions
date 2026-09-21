import { TenantMembershipInfo } from './tenant';
export interface UserPrincipal {
    id: string;
    email: string;
    fullName: string;
    isActive: boolean;
    mfaEnabled: boolean;
    isSuperAdmin: boolean;
}
export interface SessionData {
    sessionId: string;
    userId: string;
    activeTenantId: string | null;
    email: string;
    fullName: string;
    isSuperAdmin: boolean;
    roles: string[];
    permissions: string[];
    mfaVerified: boolean;
    createdAt: string;
    expiresAt: string;
}
export interface AuthLoginResponse {
    user: UserPrincipal;
    activeTenantId: string | null;
    memberships: TenantMembershipInfo[];
    mfaRequired?: boolean;
    mfaSessionToken?: string;
}
//# sourceMappingURL=auth.d.ts.map