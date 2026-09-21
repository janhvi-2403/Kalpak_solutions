# Multi-Tenancy & Data Isolation Strategy

## 1. Isolation Philosophy
In a B2B SaaS platform, tenant data isolation is an absolute security boundary. Under no circumstances should a user or process from Tenant A be able to inspect, mutate, or deduce the existence of records belonging to Tenant B.

We reject relying solely on application-level filtering (such as adding `where: { tenantId }` in frontend or controller code). Relying on application developers never forgetting a `where` clause is an anti-pattern. Instead, we implement **Defense-in-Depth Multi-Tenancy**.

---

## 2. Multi-Tenancy Architectural Layers

```
Layer 1: Identity & Session
   Client Request
         |
         v
   [SessionAuthGuard]
   Validates session token. Resolves active tenant from session.
   Never trusts client-supplied tenant ID without membership verification.
         |
         v
Layer 2: Execution Context Propagation
   [TenantInterceptor]
   Binds active tenant to Node.js AsyncLocalStorage via TenantContextService.
   Attaches tenant ID to Pino logger child instance context.
         |
         v
Layer 3: Application Data Layer
   [TenantGuard & Repositories]
   Repositories enforce tenant_id discriminator on all inserts, updates, and selects.
         |
         v
Layer 4: PostgreSQL Row-Level Security (RLS)
   [PrismaService withTenantContext()]
   Executes `SET LOCAL app.current_tenant_id = '...'` in database transactions.
   PostgreSQL RLS policies automatically filter rows at the database engine level.
```

---

## 3. PostgreSQL Row-Level Security (RLS) Strategy
* All tenant-owned tables have RLS enabled:
  ```sql
  ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
  ```
* Policies evaluate the session variable:
  ```sql
  CREATE POLICY <table_name>_tenant_isolation_policy ON <table_name>
      FOR ALL
      USING (
          is_rls_bypassed() = true
          OR tenant_id = current_tenant_id()
      )
      WITH CHECK (
          is_rls_bypassed() = true
          OR tenant_id = current_tenant_id()
      );
  ```
* Super Admin operations or background migrations explicitly invoke `is_rls_bypassed()` by setting `app.bypass_rls = 'true'` inside scoped administrative transactions.
