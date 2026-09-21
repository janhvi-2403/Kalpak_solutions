# Architecture & System Design

## 1. Overview & Architectural Philosophy
The Kalpak Solutions Service Calls & Ticket Management platform is designed as a **Modular Monolith** that is **Service-Ready**. 

Rather than prematurely distributing domain boundaries across physical microservices—which introduces distributed transaction complexity, network latency, and operational overhead—we enforce strict logical boundaries inside a single, high-performance monorepo. When scaling demands require it, any domain module (e.g. Worker, Billing, Notifications, or Reporting) can be extracted into an independent microservice with minimal refactoring.

```
+-----------------------------------------------------------------------+
|                            Client Layer                               |
|        Next.js Web App (App Router)      |     Future Mobile App      |
+------------------------------------+----------------------------------+
                                     |
                          HTTPS / REST (OpenAPI)
                                     |
+------------------------------------+----------------------------------+
|                      API Gateway & Middleware                         |
|  - Correlation ID Interceptor (x-correlation-id)                      |
|  - Security Headers (Helmet)                                          |
|  - Global Rate Limiting & Input Validation Pipe                       |
|  - HttpOnly Session Guard & MFA Gate                                  |
|  - Tenant Context Extraction & AsyncLocalStorage                      |
+------------------------------------+----------------------------------+
                                     |
+------------------------------------+----------------------------------+
|                    Modular Domain Modules (NestJS)                    |
|  [Auth]  [Tenants]  [Users/RBAC]  [Audit]  [Tickets*]  [Products*]    |
+------------------------------------+----------------------------------+
                                     |
                 PostgreSQL Session Config & RLS Policies
                                     |
+------------------------------------+----------------------------------+
|                         Persistence Layer                             |
|          PostgreSQL 16 (Row-Level Security)  |  Redis 7               |
+-----------------------------------------------------------------------+
(* Planned future business domain modules)
```

---

## 2. Directory & Workspace Topology
The codebase is structured as a pnpm/npm workspace:
* **`apps/api`**: NestJS modular REST API providing core endpoints, Swagger OpenAPI specifications, and security middleware.
* **`apps/web`**: Next.js App Router frontend organized by domain feature modules (`src/features/*`).
* **`apps/worker`**: Dedicated background processing runner for asynchronous jobs, cron schedules, SLA calculations, and external notification delivery.
* **`packages/database`**: PostgreSQL schema, migrations, RLS initialization SQL, and Prisma client wrappers.
* **`packages/config`**: Strict environment variable validation using Zod schemas.
* **`packages/logger`**: Structured JSON logging (Pino) with correlation ID tracking and automated credential redaction.
* **`packages/auth`**: Cryptographic routines: constant-time salted scrypt password hashing, session tokens, TOTP (RFC 6238) algorithms, and CSRF protection.
* **`packages/types`**: Shared domain enums, RBAC matrices, API contracts, and tenant context definitions.
* **`packages/validation`**: Shared Zod schemas, common DTO rules, and input sanitizers.
* **`packages/ui`**: Shared UI primitives and Tailwind class merge utilities.

---

## 3. Inter-Module Dependency Flow
To maintain loose coupling and high cohesion:
1. **Modules must never import private internal classes of another module.** Communication between domain modules is conducted via exported, injectable service interfaces.
2. **All cross-cutting concerns (logging, configuration, security) reside in dedicated packages** or `@Global()` core modules.
3. **Database entities are owned by their respective domain concepts.** Tenant-owned entities reference `tenant_id` consistently with strict foreign keys.
