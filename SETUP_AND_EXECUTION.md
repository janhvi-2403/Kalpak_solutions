# Kalpak Solutions — Service Calls & Ticket Management System
## Local Setup, Execution, Deployment & Troubleshooting Guide

**Document ID:** KALPAK-OPS-005  
**Version:** 1.0.0  
**Date:** October 2026  
**Status:** Operations Runbook  

---

## 1. Prerequisites

Before installing the platform, ensure your local workstation meets the following runtime requirements:

* **Node.js:** v20.x or v22.x LTS (Recommended: Node.js 22.19+)
  ```bash
  node --version # Should output v22.x or v20.x
  ```
* **Package Manager:** `pnpm` v10.x (Recommended: `10.29.2`)
  ```bash
  npm install -g pnpm@10.29.2
  pnpm --version
  ```
* **Container Runtime:** Docker Desktop with Docker Compose v2.x (for local PostgreSQL 16 & Redis 7).
* **Git:** Git version 2.40+

---

## 2. Cloning the Repository & Installing Dependencies

1. Clone the project repository:
   ```bash
   git clone https://github.com/janhvi-2403/Kalpak_solutions.git
   cd Kalpak_solutions
   ```

2. Install all monorepo dependencies across `apps/*` and `packages/*`:
   ```bash
   pnpm install
   ```

---

## 3. Environment Variable Configuration

Create `.env` in the repository root and `apps/web/.env.local` using the template below. **Never commit real secrets or production credentials into git.**

### Root `.env` Configuration (Safe Placeholders)
```env
# Application Environment
NODE_ENV=development
APP_NAME=kalpak-saas-platform
PORT=4000
WEB_PORT=3000
API_BASE_URL=http://localhost:4000
WEB_BASE_URL=http://localhost:3000

# Database Configuration (PostgreSQL 16)
DATABASE_URL=postgresql://kalpak_user:kalpak_secure_password@localhost:5432/kalpak_saas_db?schema=public
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis Configuration (Cache, Sessions, Queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Session & Security
# Generate 64-byte random hex string: openssl rand -hex 64
SESSION_SECRET=dev_session_secret_replace_in_production_min_32_characters_long
SESSION_TTL_HOURS=24
SESSION_COOKIE_NAME=kalpak_session
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# CSRF Protection
CSRF_SECRET=dev_csrf_secret_replace_in_production_min_32_characters_long

# MFA / 2-Step Authentication
MFA_APP_NAME="Kalpak Solutions"
MFA_BACKUP_CODES_COUNT=10

# Logging & Observability
LOG_LEVEL=debug
LOG_PRETTY=true

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Razorpay Test Gateway Keys
RAZORPAY_KEY_ID=rzp_test_placeholder_key_id
RAZORPAY_KEY_SECRET=placeholder_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=placeholder_webhook_secret

# Super Admin One-Time Bootstrap Secret
BOOTSTRAP_SECRET_KEY=dev_bootstrap_secret_min_32_chars_replace_in_prod
```

### Frontend `apps/web/.env.local`
```env
NEXT_PUBLIC_APP_ENV=development
API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_placeholder_key_id
```

---

## 4. Starting Backing Services (Docker Compose)

Launch PostgreSQL 16 and Redis 7 containers locally:

```bash
# Launch containers in background
pnpm run docker:up

# Verify containers are healthy
docker ps
```

The database container automatically initializes:
* Port: `5432`
* Database: `kalpak_saas_db`
* User: `kalpak_user`
* RLS Functions & Triggers from [`infrastructure/docker/init-rls.sql`](file:///c:/Kalpak_proj/infrastructure/docker/init-rls.sql)

---

## 5. Prisma Generation, Migrations & Seeding

Run the following commands to generate Prisma Client, apply baseline database schemas, and seed demonstration accounts:

```bash
# 1. Generate Prisma Client bindings
pnpm run db:generate

# 2. Push database schema to local PostgreSQL
pnpm run db:migrate

# 3. Seed baseline roles, permissions, demo tenant, and users
pnpm run db:seed
```

---

## 6. Starting Development Servers

You can start all services concurrently or run them in independent terminal windows:

### Option A: Concurrently (All Apps)
```bash
pnpm run dev
```

### Option B: Independently (Recommended for Debugging)
* **Terminal 1: Backend API Server (NestJS on Port 4000)**
  ```bash
  pnpm run dev:api
  ```
* **Terminal 2: Frontend Web App (Next.js on Port 3000)**
  ```bash
  pnpm run dev:web
  ```
* **Terminal 3: Background Worker**
  ```bash
  pnpm run dev:worker
  ```

---

## 7. Accessing Application Interfaces & Swagger

Once the servers are running, access the following URLs in your browser:

* **Main Landing Page:** [`http://localhost:3000`](http://localhost:3000)
* **Client Admin Login:** [`http://localhost:3000/login`](http://localhost:3000/login)
* **Super Admin Console:** [`http://localhost:3000/super-admin/dashboard`](http://localhost:3000/super-admin/dashboard)
* **Customer Portal (Acme Corp):** [`http://localhost:3000/portal/acme-corp/login`](http://localhost:3000/portal/acme-corp/login)
* **Backend Swagger OpenAPI Docs:** [`http://localhost:4000/api/docs`](http://localhost:4000/api/docs)

---

## 8. Demonstration Accounts & Login Credentials

The seed script ([`packages/database/prisma/seed.ts`](file:///c:/Kalpak_proj/packages/database/prisma/seed.ts)) provisions the following demonstration accounts:

| Role | Email | Password | Tenant Organization | Default Dashboard |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@kalpak.com` | `KalpakAdmin123!` | *Platform Level* | `/super-admin/dashboard` |
| **Client Admin** | `clientadmin@acme.com` | `AcmeAdmin123!` | `acme-corp` | `/dashboard` |
| **Department Head** | `depthead@acme.com` | `AcmeDept123!` | `acme-corp` | `/dashboard/department` |
| **Support Employee** | `tech@acme.com` | `AcmeTech123!` | `acme-corp` | `/dashboard/employee` |

---

## 9. Automated Testing Execution

Execute automated unit and integration tests across the monorepo:

```bash
# Run all automated tests across monorepo
pnpm test

# Run tests for specific packages
pnpm --filter @kalpak/auth run test
pnpm --filter @kalpak/config run test
pnpm --filter @kalpak/api run test
```

### Known Test Limitations & Fixes
* **`test/payments.service.spec.ts` Failure:**
  * *Cause:* `PaymentsService.createOrder` accepts unknown plan keys without throwing `BadRequestException`.
  * *Fix:* Enforce strict `PlanTier` enum check in `payments.service.ts`.
* **`test/gmail-email-integration.spec.ts` Timeout:**
  * *Cause:* External call to Google OAuth token endpoint without mock interceptor.
  * *Fix:* Stub `google.auth.OAuth2` using Jest mocks.

---

## 10. Render Cloud Deployment Architecture

The application is deployed on Render Cloud using a declarative infrastructure-as-code blueprint: [`render.yaml`](file:///c:/Kalpak_proj/render.yaml).

### 10.1 Services Defined in Blueprint
1. **`kalpak-api` (Web Service, Node runtime, Free plan):**
   * Build: `npm install -g pnpm@10.29.2 && pnpm install && pnpm --filter @kalpak/database run db:generate && pnpm --filter "./packages/*" run build && pnpm --filter @kalpak/api run build`
   * Start: `node apps/api/dist/main.js`
   * Health Check: `/health`
2. **`kalpak-web` (Web Service, Node runtime, Free plan):**
   * Build: `npm install -g pnpm@10.29.2 && pnpm install && pnpm --filter @kalpak/database run db:generate && pnpm --filter "./packages/*" run build && pnpm --filter @kalpak/web run build`
   * Start: `pnpm --filter @kalpak/web run start`
3. **`kalpak-db` (Managed PostgreSQL 16, Free plan):**
   * Region: Oregon
   * Major Version: 16

### 10.2 Understanding Free-Tier Cold Starts
Because the backend is hosted on Render's **Free Tier**:
* The container enters a suspended sleep state after **15 minutes of inactivity**.
* When a user visits the login form, the first request triggers a **cold start** taking **30 to 60 seconds** while Render spins up the container and initializes PostgreSQL connections.
* **Workaround:** When you encounter *"The server is waking up from sleep on the Render free tier (cold start)"*, wait 45 seconds and click Sign In again.
* **Production Fix:** Upgrade the backend service in Render Dashboard from **Free** to **Starter** ($7/mo) to ensure 24/7 continuous operation without sleep cycles.
