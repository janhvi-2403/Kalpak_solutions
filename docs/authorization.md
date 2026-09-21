# Authorization & RBAC Architecture

## 1. Design Overview
The system implements a centralized, tenant-scoped **Role-Based Access Control (RBAC)** architecture. Authorization rules are never hardcoded as ad-hoc conditionals inside controller routes or service queries.

Access decisions are evaluated in a two-tier hierarchy:
1. **System Roles (Global)**: Evaluated at the platform level (e.g. `Super Admin`).
2. **Tenant Membership Roles**: Evaluated within the boundary of the user's active tenant (e.g. `Client Admin`, `Department Admin`, `Support Employee`, `Customer`).

---

## 2. Baseline Roles & Access Scope

| Role | Scope | Primary Purpose |
| :--- | :--- | :--- |
| **Super Admin** | Global (Platform) | Kalpak Solutions platform operators. Can view and manage all client organizations, global settings, and audit logs. Bypasses tenant RLS restrictions. |
| **Client Admin** | Single Tenant | Executive administrator for a client company. Can manage company users, departments, ticket settings, and organization billing. |
| **Department Admin / POC** | Single Tenant / Dept | Departmental lead or Point-of-Contact. Can assign and oversee tickets, monitor department SLAs, and review operational reports. |
| **Support Employee** | Single Tenant | Service technician or support engineer. Can view assigned tickets, update progress, add diagnostic notes, and resolve service calls. |
| **Customer** | Single Tenant | End-client user or customer contact. Can report new service calls/tickets and track their status. |

---

## 3. Enforcement Pipeline
* **`@RequirePermissions(...)` Decorator**: Declares atomic permissions required for an endpoint (e.g. `@RequirePermissions(PermissionCode.TICKET_READ)`).
* **`@Roles(...)` Decorator**: Declares system-level or membership roles required.
* **`PermissionsGuard`**: Evaluates whether the user's active tenant membership contains the required permissions. Super admins bypass automatically.
* **`RolesGuard`**: Evaluates whether the user's role matches specified role requirements.
