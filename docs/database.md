# Database Conventions & Schema Design

## 1. Engine & Conventions
* **Engine**: PostgreSQL 16
* **Primary Keys**: Universally Unique Identifiers (UUIDv4) generated via PostgreSQL `gen_random_uuid()` to prevent sequential ID guessing and enable distributed identity generation.
* **Naming Standard**: `snake_case` for all tables, columns, indexes, and constraints.
* **Audit Columns**:
  - `created_at TIMESTAMPTZ(6) DEFAULT now() NOT NULL`
  - `updated_at TIMESTAMPTZ(6) DEFAULT now() NOT NULL`
  - `deleted_at TIMESTAMPTZ(6) NULL` (for soft-deletable records)
* **Soft Deletion**: Entities such as `Tenants`, `Users`, and future business entities implement soft deletion via a nullable `deleted_at` timestamp. Queries filter `deleted_at IS NULL` to preserve referential integrity and audit compliance.

---

## 2. Foundational Entities & Relationships

### `tenants`
Root customer organizations.
* Columns: `id` (UUID PK), `name`, `slug` (Unique), `status` (ACTIVE, SUSPENDED, TRIAL, CANCELLED), `settings` (JSONB), `created_at`, `updated_at`, `deleted_at`.
* Indexes: `idx_tenants_status`, `idx_tenants_deleted_at`.

### `users`
Global user identities. A user can belong to multiple tenants via memberships.
* Columns: `id` (UUID PK), `email` (Unique), `password_hash`, `full_name`, `phone_number`, `is_active`, `is_super_admin`, `mfa_enabled`, `mfa_secret`, `mfa_backup_codes`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`.
* Indexes: `idx_users_email`, `idx_users_is_active`, `idx_users_deleted_at`.

### `tenant_memberships`
Join table connecting a user to a specific tenant with a specific role.
* Columns: `id` (UUID PK), `tenant_id` (FK -> tenants), `user_id` (FK -> users), `role_id` (FK -> roles), `is_default`, `created_at`, `updated_at`.
* Constraints: Unique constraint on `(tenant_id, user_id)`.
* Indexes: `idx_memberships_tenant_id`, `idx_memberships_user_id`.

### `roles` & `permissions`
RBAC foundation.
* `roles`: `id`, `tenant_id` (NULL for system roles; set for custom tenant roles), `name`, `description`, `is_system`, `created_at`, `updated_at`. Unique on `(tenant_id, name)`.
* `permissions`: `id`, `code` (Unique), `description`, `module`, `created_at`.
* `role_permissions`: Join table with composite PK `(role_id, permission_id)`.

### `sessions`
Active authentication sessions.
* Columns: `id`, `user_id` (FK -> users), `active_tenant_id` (FK -> tenants), `session_token_hash` (Unique SHA-256), `ip_address`, `user_agent`, `mfa_verified`, `expires_at`, `revoked_at`, `created_at`, `updated_at`.

### `audit_events`
Immutable audit ledger.
* Columns: `id`, `tenant_id`, `actor_id`, `event_type`, `resource_type`, `resource_id`, `action`, `metadata` (JSONB), `ip_address`, `user_agent`, `created_at`.

---

## 3. Database Migrations
Migrations are managed deterministically using Prisma:
```bash
# Generate Prisma client
npm run db:generate

# Apply migrations locally in development
npm run db:migrate

# Apply migrations in production
npx prisma migrate deploy

# Seed baseline roles and permissions
npm run db:seed
```
