export declare enum SystemRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    CLIENT_ADMIN = "CLIENT_ADMIN",
    DEPARTMENT_ADMIN = "DEPARTMENT_ADMIN",
    SUPPORT_EMPLOYEE = "SUPPORT_EMPLOYEE",
    CUSTOMER = "CUSTOMER"
}
export declare enum TenantStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    TRIAL = "TRIAL",
    CANCELLED = "CANCELLED"
}
export declare enum PermissionCode {
    TENANT_READ = "tenant:read",
    TENANT_UPDATE = "tenant:update",
    TENANT_SETTINGS = "tenant:settings",
    TENANT_MANAGE_ALL = "tenant:manage:all",// Super Admin only
    USER_READ = "user:read",
    USER_CREATE = "user:create",
    USER_UPDATE = "user:update",
    USER_DELETE = "user:delete",
    ROLE_ASSIGN = "role:assign",
    ROLE_MANAGE = "role:manage",
    TICKET_CREATE = "ticket:create",
    TICKET_READ = "ticket:read",
    TICKET_UPDATE = "ticket:update",
    TICKET_ASSIGN = "ticket:assign",
    TICKET_RESOLVE = "ticket:resolve",
    TICKET_DELETE = "ticket:delete",
    CUSTOMER_READ = "customer:read",
    CUSTOMER_CREATE = "customer:create",
    CUSTOMER_UPDATE = "customer:update",
    PRODUCT_READ = "product:read",
    PRODUCT_MANAGE = "product:manage",
    SERVICE_READ = "service:read",
    SERVICE_MANAGE = "service:manage",
    REPORT_VIEW = "report:view",
    REPORT_EXPORT = "report:export",
    AUDIT_READ = "audit:read",
    BILLING_VIEW = "billing:view",
    BILLING_MANAGE = "billing:manage"
}
export declare enum AuditEventType {
    AUTH_LOGIN_SUCCESS = "AUTH_LOGIN_SUCCESS",
    AUTH_LOGIN_FAILED = "AUTH_LOGIN_FAILED",
    AUTH_LOGOUT = "AUTH_LOGOUT",
    AUTH_MFA_CHALLENGE = "AUTH_MFA_CHALLENGE",
    AUTH_MFA_VERIFIED = "AUTH_MFA_VERIFIED",
    AUTH_PASSWORD_RESET_REQUESTED = "AUTH_PASSWORD_RESET_REQUESTED",
    AUTH_PASSWORD_RESET_COMPLETED = "AUTH_PASSWORD_RESET_COMPLETED",
    AUTH_SESSION_REVOKED = "AUTH_SESSION_REVOKED",
    USER_CREATED = "USER_CREATED",
    USER_UPDATED = "USER_UPDATED",
    USER_DEACTIVATED = "USER_DEACTIVATED",
    USER_ROLE_ASSIGNED = "USER_ROLE_ASSIGNED",
    TENANT_CREATED = "TENANT_CREATED",
    TENANT_UPDATED = "TENANT_UPDATED",
    TENANT_STATUS_CHANGED = "TENANT_STATUS_CHANGED",
    TICKET_CREATED = "TICKET_CREATED",
    TICKET_STATUS_CHANGED = "TICKET_STATUS_CHANGED",
    TICKET_ASSIGNED = "TICKET_ASSIGNED",
    SECURITY_POLICY_VIOLATION = "SECURITY_POLICY_VIOLATION",
    PERMISSION_OVERRIDE = "PERMISSION_OVERRIDE"
}
//# sourceMappingURL=enums.d.ts.map