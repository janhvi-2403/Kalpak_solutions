"use strict";
// ==============================================================================
// Domain Roles & System Permissions
// ==============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventType = exports.PermissionCode = exports.TenantStatus = exports.SystemRole = void 0;
var SystemRole;
(function (SystemRole) {
    SystemRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    SystemRole["CLIENT_ADMIN"] = "CLIENT_ADMIN";
    SystemRole["DEPARTMENT_ADMIN"] = "DEPARTMENT_ADMIN";
    SystemRole["SUPPORT_EMPLOYEE"] = "SUPPORT_EMPLOYEE";
    SystemRole["CUSTOMER"] = "CUSTOMER";
})(SystemRole || (exports.SystemRole = SystemRole = {}));
var TenantStatus;
(function (TenantStatus) {
    TenantStatus["ACTIVE"] = "ACTIVE";
    TenantStatus["SUSPENDED"] = "SUSPENDED";
    TenantStatus["TRIAL"] = "TRIAL";
    TenantStatus["CANCELLED"] = "CANCELLED";
})(TenantStatus || (exports.TenantStatus = TenantStatus = {}));
var PermissionCode;
(function (PermissionCode) {
    // Tenant Administration
    PermissionCode["TENANT_READ"] = "tenant:read";
    PermissionCode["TENANT_UPDATE"] = "tenant:update";
    PermissionCode["TENANT_SETTINGS"] = "tenant:settings";
    PermissionCode["TENANT_MANAGE_ALL"] = "tenant:manage:all";
    // User & RBAC Administration
    PermissionCode["USER_READ"] = "user:read";
    PermissionCode["USER_CREATE"] = "user:create";
    PermissionCode["USER_UPDATE"] = "user:update";
    PermissionCode["USER_DELETE"] = "user:delete";
    PermissionCode["ROLE_ASSIGN"] = "role:assign";
    PermissionCode["ROLE_MANAGE"] = "role:manage";
    // Service Calls & Tickets
    PermissionCode["TICKET_CREATE"] = "ticket:create";
    PermissionCode["TICKET_READ"] = "ticket:read";
    PermissionCode["TICKET_UPDATE"] = "ticket:update";
    PermissionCode["TICKET_ASSIGN"] = "ticket:assign";
    PermissionCode["TICKET_RESOLVE"] = "ticket:resolve";
    PermissionCode["TICKET_DELETE"] = "ticket:delete";
    // Customer Management
    PermissionCode["CUSTOMER_READ"] = "customer:read";
    PermissionCode["CUSTOMER_CREATE"] = "customer:create";
    PermissionCode["CUSTOMER_UPDATE"] = "customer:update";
    // Products & Services
    PermissionCode["PRODUCT_READ"] = "product:read";
    PermissionCode["PRODUCT_MANAGE"] = "product:manage";
    PermissionCode["SERVICE_READ"] = "service:read";
    PermissionCode["SERVICE_MANAGE"] = "service:manage";
    // Reporting & Analytics
    PermissionCode["REPORT_VIEW"] = "report:view";
    PermissionCode["REPORT_EXPORT"] = "report:export";
    // Audit Logs
    PermissionCode["AUDIT_READ"] = "audit:read";
    // Billing & Subscriptions
    PermissionCode["BILLING_VIEW"] = "billing:view";
    PermissionCode["BILLING_MANAGE"] = "billing:manage";
})(PermissionCode || (exports.PermissionCode = PermissionCode = {}));
var AuditEventType;
(function (AuditEventType) {
    AuditEventType["AUTH_LOGIN_SUCCESS"] = "AUTH_LOGIN_SUCCESS";
    AuditEventType["AUTH_LOGIN_FAILED"] = "AUTH_LOGIN_FAILED";
    AuditEventType["AUTH_LOGOUT"] = "AUTH_LOGOUT";
    AuditEventType["AUTH_MFA_CHALLENGE"] = "AUTH_MFA_CHALLENGE";
    AuditEventType["AUTH_MFA_VERIFIED"] = "AUTH_MFA_VERIFIED";
    AuditEventType["AUTH_PASSWORD_RESET_REQUESTED"] = "AUTH_PASSWORD_RESET_REQUESTED";
    AuditEventType["AUTH_PASSWORD_RESET_COMPLETED"] = "AUTH_PASSWORD_RESET_COMPLETED";
    AuditEventType["AUTH_SESSION_REVOKED"] = "AUTH_SESSION_REVOKED";
    AuditEventType["USER_CREATED"] = "USER_CREATED";
    AuditEventType["USER_UPDATED"] = "USER_UPDATED";
    AuditEventType["USER_DEACTIVATED"] = "USER_DEACTIVATED";
    AuditEventType["USER_ROLE_ASSIGNED"] = "USER_ROLE_ASSIGNED";
    AuditEventType["TENANT_CREATED"] = "TENANT_CREATED";
    AuditEventType["TENANT_UPDATED"] = "TENANT_UPDATED";
    AuditEventType["TENANT_STATUS_CHANGED"] = "TENANT_STATUS_CHANGED";
    AuditEventType["TICKET_CREATED"] = "TICKET_CREATED";
    AuditEventType["TICKET_STATUS_CHANGED"] = "TICKET_STATUS_CHANGED";
    AuditEventType["TICKET_ASSIGNED"] = "TICKET_ASSIGNED";
    AuditEventType["SECURITY_POLICY_VIOLATION"] = "SECURITY_POLICY_VIOLATION";
    AuditEventType["PERMISSION_OVERRIDE"] = "PERMISSION_OVERRIDE";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
//# sourceMappingURL=enums.js.map