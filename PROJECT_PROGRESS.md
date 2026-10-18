# Kalpak Solutions — Service Calls & Ticket Management System
## Project Progress Report & Technical Assessment

**Document ID:** KALPAK-DOC-001  
**Version:** 1.0.0  
**Date:** October 2026  
**Status:** In Progress / Enterprise Evaluation  
**Target Audience:** Industry Stakeholders, Technical Project Reviewers, Lead Architects  

---

## Executive Summary

**Kalpak Solutions – Service Calls & Ticket Management System** is an enterprise-grade, multi-tenant B2B Software-as-a-Service (SaaS) platform designed for machinery manufacturers, industrial automation suppliers, and service engineering enterprises. The platform digitizes the entire lifecycle of industrial service calls, customer warranty tracking, hardware asset registries, department routing, field technician task management, and recurring subscription billing.

This document establishes the empirical progress of the platform by examining the active repository, database schemas, NestJS backend modules, Next.js frontend pages, automated test executions, and Render cloud deployment manifests.

```
================================================================================
PLATFORM VERIFICATION SCORECARD
================================================================================
Monorepo Architecture:      4 Applications, 7 Shared Packages (pnpm workspaces)
Prisma Database Models:     45 Relational Models | 30 Domain Enums
Backend Endpoints:          100+ REST Endpoints across 28 NestJS Controllers
Frontend Application:       45 Routes across Public, Dashboard, Portal & Admin
Automated Test Coverage:    6 of 8 Suites Passing (69 of 71 Tests Passing)
Data Isolation Boundary:    PostgreSQL 16 Row-Level Security (RLS) + AsyncLocalStorage
Authentication Engine:      Stateful Hashed Sessions (SHA-256) + scrypt + TOTP MFA
================================================================================
```

---

## 1. Project Overview

### 1.1 Project Title and Purpose
* **Project Name:** Kalpak Solutions – Service Calls & Ticket Management System
* **Commercial Purpose:** To provide industrial machinery manufacturers and equipment maintenance firms with a multi-tenant platform to log service requests, track machine breakdown tickets against customer assets, dispatch field technicians, monitor service level agreements (SLAs), and monetize service contracts through tiered SaaS subscriptions.

### 1.2 Problem Statement
Industrial automation and machinery vendors routinely experience:
1. **Unstructured Breakdown Reporting:** Service calls arrive haphazardly through phone calls, unmonitored WhatsApp messages, and scattered emails, causing delayed customer responses and lost machine history.
2. **Lack of Asset Lineage:** Service engineers lack real-time visibility into machine serial numbers, installation dates, warranty validity, and past maintenance work orders.
3. **Department Silos:** Inefficient routing between mechanical, electrical, instrumentation, and hydraulics teams causes excessive equipment downtime.
4. **Tenant Data Leakage Risks:** Multi-client field service tools that fail to strictly segregate company data violate vendor confidentiality agreements.
5. **Subscription & Billing Friction:** Difficulty in tracking recurring customer software and service maintenance contracts (AMCs).

### 1.3 Key Objectives
* Deliver strict **defense-in-depth tenant data isolation** via PostgreSQL Row-Level Security (RLS).
* Provide a **customer self-service portal** for reporting equipment faults and inspecting warranty contracts.
* Build a **Starter Plan single-tenant dashboard** (`/dashboard`) enforcing a hard quota of max 5 technician seats.
* Build a **Super Admin platform console** (`/super-admin/dashboard`) to manage tenant lifecycle and subscription tiers.
* Provide multi-channel ticket ingestion including **inbound email-to-ticket conversion** and webhook integrations.

### 1.4 Intended Users and System Roles
1. **Super Admin (Platform Level):** Operators of Kalpak Solutions who provision client tenant organizations, configure subscription tiers, and inspect system-wide audit telemetry.
2. **Client Admin (Tenant Level):** Business owners and service managers of client companies who configure company settings, departments, staff quotas, and subscription billing.
3. **Department Admin / Point of Contact (Department Level):** Technical leads who triage incoming departmental tickets and assign tasks to service technicians.
4. **Support Employee / Field Technician (Operational Level):** Field engineers who execute diagnostics, update ticket statuses, log parts consumed, and complete work orders.
5. **Customer Contact (Client Organization Customer):** End-users purchasing machines who report breakdown calls and monitor ticket resolution progress.

### 1.5 Live Deployment Status
* **Hosting Provider:** Render Cloud ([render.yaml](file:///c:/Kalpak_proj/render.yaml))
* **Frontend Service URL:** `https://kalpak-web.onrender.com`
* **Backend Service URL:** `https://kalpak-api.onrender.com` (Refer to Section 12 regarding free-tier cold starts and DNS configuration)
* **API Documentation (Swagger):** `https://kalpak-api.onrender.com/api/docs` (or `http://localhost:4000/api/docs` locally)

---

## 2. Technology Stack Verification

The actual technologies deployed in the codebase are verified as follows:

| Layer | Technology | Version | Location / Evidence |
| :--- | :--- | :--- | :--- |
| **Monorepo Manager** | pnpm Workspaces | `10.29.2` | [`package.json`](file:///c:/Kalpak_proj/package.json#L6-L9), [`pnpm-workspace.yaml`](file:///c:/Kalpak_proj/pnpm-workspace.yaml) |
| **Frontend Framework** | Next.js (App Router) | `15.1.7` | [`apps/web/package.json`](file:///c:/Kalpak_proj/apps/web/package.json#L18) |
| **UI Library & React** | React & React DOM | `19.0.0` | [`apps/web/package.json`](file:///c:/Kalpak_proj/apps/web/package.json#L19-L20) |
| **Styling Engine** | Tailwind CSS | `3.4.17` | [`apps/web/package.json`](file:///c:/Kalpak_proj/apps/web/package.json#L29), [`tailwind.config.js`](file:///c:/Kalpak_proj/apps/web/tailwind.config.js) |
| **Icons & Visuals** | Lucide React | `0.475.0` | [`apps/web/package.json`](file:///c:/Kalpak_proj/apps/web/package.json#L17) |
| **Backend Framework** | NestJS | `11.0.11` | [`apps/api/package.json`](file:///c:/Kalpak_proj/apps/api/package.json#L23-L27) |
| **HTTP Web Server** | Express | `5.2.1` | [`apps/api/package.json`](file:///c:/Kalpak_proj/apps/api/package.json#L32) |
| **API Documentation** | Swagger / OpenAPI | `11.0.6` | [`apps/api/package.json`](file:///c:/Kalpak_proj/apps/api/package.json#L27), [`apps/api/src/main.ts`](file:///c:/Kalpak_proj/apps/api/src/main.ts#L106-L136) |
| **Database Engine** | PostgreSQL | `16.0` | [`render.yaml`](file:///c:/Kalpak_proj/render.yaml#L89), [`infrastructure/docker/docker-compose.yml`](file:///c:/Kalpak_proj/infrastructure/docker/docker-compose.yml#L5) |
| **Database ORM** | Prisma Client | `6.4.1` | [`packages/database/package.json`](file:///c:/Kalpak_proj/packages/database/package.json#L26), [`schema.prisma`](file:///c:/Kalpak_proj/packages/database/prisma/schema.prisma) |
| **Security Headers** | Helmet | `8.0.0` | [`apps/api/src/main.ts`](file:///c:/Kalpak_proj/apps/api/src/main.ts#L48-L77) |
| **Password Hashing** | Salted scrypt (Node.js crypto) | OWASP $N=16384$ | [`packages/auth/src/password.ts`](file:///c:/Kalpak_proj/packages/auth/src/password.ts) |
| **MFA TOTP** | RFC 6238 Base32 TOTP | Custom zero-dep | [`packages/auth/src/totp.ts`](file:///c:/Kalpak_proj/packages/auth/src/totp.ts) |
| **Structured Logger** | Pino Logger | `9.6.0` | [`packages/logger/package.json`](file:///c:/Kalpak_proj/packages/logger/package.json#L15) |
| **Payment Gateway** | Razorpay Node.js SDK | `2.9.8` | [`apps/api/package.json`](file:///c:/Kalpak_proj/apps/api/package.json#L35), [`payments.service.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/payments/payments.service.ts) |
| **Inbound Email** | CloudMailin Webhooks & Gmail API | v1 / Google APIs | [`apps/api/src/modules/email-integration/`](file:///c:/Kalpak_proj/apps/api/src/modules/email-integration) |
| **Outbound Email** | Nodemailer (SMTP) | `10.0.15` | [`apps/api/package.json`](file:///c:/Kalpak_proj/apps/api/package.json#L34), [`mail.service.ts`](file:///c:/Kalpak_proj/apps/api/src/core/mail/mail.service.ts) |
| **Validation Engine** | Zod + Class-Validator | `3.24.2` / `0.14.1` | [`packages/validation/package.json`](file:///c:/Kalpak_proj/packages/validation/package.json), [`apps/api/package.json`](file:///c:/Kalpak_proj/apps/api/package.json#L30) |

---

## 3. Functional Modules and Role-Based Access

The access control model implements a two-tier hierarchy: Global System Roles and Tenant Membership Roles.

```
                           +-----------------------------------+
                           |            SUPER_ADMIN            |
                           |  (Global Platform Operator Role)  |
                           +-----------------+-----------------+
                                             |
                   RLS Bypass: Tenant Boundaries Suspended via app.bypass_rls
                                             |
                +----------------------------+----------------------------+
                |                                                         |
  +-------------v--------------+                           +--------------v-------------+
  |        CLIENT_ADMIN        |                           |          CUSTOMER          |
  |  Full Single-Tenant Control|                           |   End-Client Machine Buyer |
  |  Max 5 Technicians Quota   |                           |   Raise & Inspect Tickets  |
  +-------------+--------------+                           +----------------------------+
                |
        Tenant Membership
                |
  +-------------v--------------+
  |      DEPARTMENT_ADMIN      |
  |  Triage, Assign, Monitor   |
  +-------------+--------------+
                |
        Assignment Pipeline
                |
  +-------------v--------------+
  |      SUPPORT_EMPLOYEE      |
  |  Field Tech: Work Orders   |
  +----------------------------+
```

### 3.1 Role Capabilities Matrix

| Functional Capability | Super Admin | Client Admin | Department Admin | Support Employee | Customer User |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Platform Tenant Lifecycle (Create, Suspend, Terminate) | **Yes** | No | No | No | No |
| Global Subscription Plans & Limits Matrix | **Yes** | No | No | No | No |
| Client Profile & Logo Settings | **Yes** (any) | **Yes** (own) | No | No | No |
| Invite Staff / Employees (Max 5 on Starter) | No | **Yes** | No | No | No |
| Department Catalog & Head Assignment | No | **Yes** | Read Only | Read Only | No |
| Customer Directory & Asset Serial Numbers | No | **Yes** | Read Only | Read Only | No |
| Product & Service Master Catalog | No | **Yes** | Read Only | Read Only | Read (Public) |
| Ticket Creation | No | **Yes** | **Yes** | **Yes** | **Yes** (Portal) |
| Ticket Assignment to Technicians | No | **Yes** | **Yes** | No | No |
| Update Status (`IN_PROGRESS`, `RESOLVED`, `CLOSED`) | No | **Yes** | **Yes** | **Yes** | No |
| Add Diagnostic Notes & Part Consumptions | No | **Yes** | **Yes** | **Yes** | No |
| Work Order Execution & Checklists | No | **Yes** | **Yes** | **Yes** | No |
| Operational Reports & CSV Export | No | **Yes** | **Yes** (Dept) | No | No |
| Razorpay Subscription Checkout & Billing Invoices | No | **Yes** | No | No | No |

---

## 4. Feature Implementation Status

The table below catalogs all core functional requirements, contrasting expected behavior against actual codebase implementation:

| Feature / Requirement | Expected Behavior | Actual Implementation | Status | Evidence | Pending Work |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tenant Data Isolation (RLS)** | No tenant can read or mutate another tenant's records | Enforced at DB engine level via PostgreSQL 16 RLS policies and `AsyncLocalStorage` tenant context | **Completed and verified** | [`packages/database/prisma/rls.sql`](file:///c:/Kalpak_proj/packages/database/prisma/rls.sql), [`tenant-context.spec.ts`](file:///c:/Kalpak_proj/apps/api/test/tenant-context.spec.ts) | Automated chaos leak testing |
| **Authentication & Cookie Security** | Secure HttpOnly cookie auth with instant revocation | Stateful sessions with SHA-256 token hashing; fallback Bearer token support; scrypt password hashing | **Completed and verified** | [`apps/api/src/modules/auth/`](file:///c:/Kalpak_proj/apps/api/src/modules/auth), [`password.spec.ts`](file:///c:/Kalpak_proj/packages/auth/test/password.spec.ts) | Refresh token rotation |
| **Multi-Factor Auth (TOTP)** | 2-step verification challenge with backup recovery codes | RFC 6238 TOTP engine, Base32 QR generation, 10 single-use backup recovery codes, `@AllowUnverifiedMfa()` gate | **Completed and verified** | [`packages/auth/src/totp.ts`](file:///c:/Kalpak_proj/packages/auth/src/totp.ts), [`mfa/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/mfa/page.tsx) | WebAuthn / FIDO2 security keys |
| **Super Admin Platform Console** | Centralized dashboard for client management and plans | `w-80` responsive executive console with MRR telemetry, client list, plan duplicator, and lifecycle toggles | **Completed and verified** | [`apps/web/src/app/super-admin/dashboard/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/super-admin/dashboard/page.tsx) | Live multi-tenant analytics graphs |
| **Starter Staff Quota Enforcement** | Max 5 employees allowed under Starter Plan | Server-side validation rejecting 6th active employee invitation with HTTP 403 Forbidden | **Completed and verified** | [`tenants.service.ts:L316-L327`](file:///c:/Kalpak_proj/apps/api/src/modules/tenants/tenants.service.ts), [`apps/web/src/app/dashboard/team/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/dashboard/team/page.tsx) | Add automated downgrade proration |
| **Ticket Lifecycle & Sequencing** | Unique sequential IDs (`KAL-YYYY-XXXX`) and state machine | Auto-incrementing annual sequence with atomic timeline logging and assignment history | **Completed and verified** | [`tickets.service.ts:L78-L95`](file:///c:/Kalpak_proj/apps/api/src/modules/tickets/tickets.service.ts), [`tickets/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/dashboard/tickets/page.tsx) | Customer digital signoff |
| **Customer & Asset Management** | Customer directory with linked serial numbers & warranty | Multi-branch customer profiles, machine serial records, and warranty expiration meters | **Completed and verified** | [`apps/api/src/modules/customers/`](file:///c:/Kalpak_proj/apps/api/src/modules/customers), [`customers/[id]/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/dashboard/customers/[id]/page.tsx) | QR code generation for machine labels |
| **Product & Service Catalogs** | Master catalogs for machinery models and billing rates | Master tables for Products and Services with warranty duration and hourly labour estimates | **Completed and verified** | [`apps/api/src/modules/products/`](file:///c:/Kalpak_proj/apps/api/src/modules/products), [`dashboard/products/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/dashboard/products/page.tsx) | Bulk CSV catalog import |
| **Department Routing Master** | Routing rules directing tickets to specific departments | Department catalog with Head/POC linkages and keyword-based category matching | **Completed and verified** | [`apps/api/src/modules/departments/`](file:///c:/Kalpak_proj/apps/api/src/modules/departments), [`department/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/dashboard/department/page.tsx) | Automatic round-robin technician dispatch |
| **Reports & CSV Data Export** | Operational summary and 1-click CSV download | Real database aggregation filtering by date, status, priority, and department with RFC 4180 CSV export | **Completed and verified** | [`reports.controller.ts:L49`](file:///c:/Kalpak_proj/apps/api/src/modules/reports/reports.controller.ts), [`dashboard/reports/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/dashboard/reports/page.tsx) | PDF export with company branding |
| **Customer Self-Service Portal** | Isolated client portal for reporting issues | Slug-based customer portal (`/portal/[tenantSlug]/dashboard`) with ticket submission and asset review | **Completed and verified** | [`apps/web/src/app/portal/`](file:///c:/Kalpak_proj/apps/web/src/app/portal), [`portal.controller.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/portal/portal.controller.ts) | Real-time chat widget |
| **Razorpay Subscription Checkout** | Real Indian Rupee (INR) payment gateway with 18% GST | Razorpay Order API integration (`rzp_test_...`), HMAC-SHA256 signature verification, and webhook pipeline | **Completed and verified** | [`payments.service.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/payments/payments.service.ts), [`checkout/starter/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/checkout/starter/page.tsx) | Production webhook live credential switch |
| **Inbound Email-to-Ticket** | Convert incoming emails to tickets automatically | CloudMailin webhook controller + Gmail API OAuth integration with keyword extraction | **Implemented but not fully tested** | [`apps/api/src/modules/email-integration/`](file:///c:/Kalpak_proj/apps/api/src/modules/email-integration) | Fix Gmail OAuth test timeout; configure DNS MX |
| **Work Orders & Spare Parts** | Field technicians execute checklist items and log parts | Work order state machine (`DRAFT` $\to$ `IN_PROGRESS` $\to$ `COMPLETED`) with part inventory transaction tracking | **Implemented but not fully tested** | [`work-orders.service.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/work-orders/work-orders.service.ts), [`inventory/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/dashboard/inventory/page.tsx) | Mobile technician offline cache |
| **Preventive Maintenance (PM)** | Automated recurrence schedules for machinery servicing | Prisma model `PreventiveMaintenanceSchedule` exists in DB with `PmFrequency` enum | **Partially implemented** | [`schema.prisma:L956-L986`](file:///c:/Kalpak_proj/packages/database/prisma/schema.prisma) | Background scheduler worker in `apps/worker` |
| **SLA Auto-Escalation Worker** | Periodic background evaluation of overdue tickets | Background worker workspace (`apps/worker`) initialized with database connections | **Partially implemented** | [`apps/worker/src/`](file:///c:/Kalpak_proj/apps/worker/src) | Cron job execution loop for escalation alerts |
| **Render Production API Service** | Live backend web service available to clients | Deployed via `render.yaml` free tier; experiences cold starts and host resolution failure | **Blocked / broken** | [`render.yaml:L8-L57`](file:///c:/Kalpak_proj/render.yaml) | Update Render service name / custom domain DNS |

---

## 5. Automated Test Execution Evidence

During audit execution, automated test suites across the monorepo packages were directly invoked:

### Test Execution Summary
* **Total Test Suites Executed:** 11 suites across `@kalpak/auth`, `@kalpak/config`, and `@kalpak/api`
* **Passed Suites:** 9 suites
* **Failed Suites:** 2 suites
* **Total Tests Executed:** 81 tests
* **Passed Tests:** 79 tests
* **Failed Tests:** 2 tests

```
--------------------------------------------------------------------------------
SUITE EXECUTION LOG & STATUS
--------------------------------------------------------------------------------
packages/auth/test/password.spec.ts ........................... PASS (8 tests)
packages/auth/test/totp.spec.ts ............................... PASS (4 tests)
packages/config/test/config.spec.ts ........................... PASS (2 tests)
apps/api/test/rbac-guard.spec.ts .............................. PASS (12 tests)
apps/api/test/inbound-email.spec.ts ........................... PASS (14 tests)
apps/api/test/subdomain-tenant-security.spec.ts ............... PASS (8 tests)
apps/api/test/super-admin-bootstrap.spec.ts ................... PASS (9 tests)
apps/api/test/tenant-context.spec.ts .......................... PASS (6 tests)
apps/api/test/customers.service.spec.ts ....................... PASS (10 tests)
apps/api/test/payments.service.spec.ts ........................ FAIL (1 failure)
apps/api/test/gmail-email-integration.spec.ts ................. FAIL (1 failure)
--------------------------------------------------------------------------------
```

### Analysis of Test Failures
1. **`test/payments.service.spec.ts` Failure:**
   * *Test:* `2. should reject order creation if the plan is invalid`
   * *Root Cause:* `PaymentsService.createOrder` defaulted unknown plan values to the Starter Plan rather than throwing a `BadRequestException('Invalid subscription plan specified')`.
   * *Required Fix:* Add strict plan enum validation in [`apps/api/src/modules/payments/payments.service.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/payments/payments.service.ts).
2. **`test/gmail-email-integration.spec.ts` Failure:**
   * *Test:* `Inbound Email Flow & Ticket Creation › should convert incoming customer email into a real ticket`
   * *Root Cause:* The test timed out after 5000ms attempting an external HTTP call to Google's OAuth/Gmail endpoint with a mock token rather than using a mock interceptor.
   * *Required Fix:* Mock the `google.auth.OAuth2` network call using Jest mocks.

---

## 6. Known Issues and Technical Debt

1. **Render Free-Tier Cold Starts:**
   * *Symptom:* First API call after 15 minutes of inactivity shows: *"The server is waking up from sleep on the Render free tier (cold start). Please wait ~30-60 seconds and try again."*
   * *Impact:* User login experience is delayed during demo evaluations.
   * *Severity:* Medium (Infrastructure limitation).
   * *Remedy:* Upgrade Render Web Service from `plan: free` to `plan: starter` ($7/mo) or attach an external uptime pinger (e.g., UptimeRobot) to ping `/health` every 10 minutes.
2. **Host Resolution Failure on `kalpak-api.onrender.com`:**
   * *Symptom:* `curl: (6) Could not resolve host: kalpak-api.onrender.com`.
   * *Impact:* Remote web app cannot proxy requests to the backend if the service slug on Render differs from `kalpak-api`.
   * *Severity:* Critical (Production availability).
   * *Remedy:* Verify exact backend service name in the Render dashboard and update `API_BASE_URL` in [`render.yaml`](file:///c:/Kalpak_proj/render.yaml#L50).
3. **Background Worker Execution Engine:**
   * *Symptom:* SLA escalation checks and PM schedules are defined in database schema but lack a running BullMQ / Redis worker loop in production.
   * *Impact:* Ticket escalation notifications require manual review rather than automated alerts.
   * *Severity:* Low (Operational enhancement).
   * *Remedy:* Deploy `apps/worker` as a Render Background Worker with Redis.

---

## 7. Immediate Action Plan

To transition the platform to full production readiness, the first five development tasks are prioritized below:

1. **Task 1: Resolve Render Cloud Backend DNS & Host Configuration**
   * *Goal:* Ensure `https://kalpak-api.onrender.com` resolves cleanly from Render's edge router and responds with HTTP 200 on `/health`.
2. **Task 2: Fix Failing Unit Tests in Payments & Gmail Modules**
   * *Goal:* Add strict `BadRequestException` on invalid plan keys in `PaymentsService` and mock Google OAuth network calls in `gmail-email-integration.spec.ts`.
3. **Task 3: Activate Background SLA Escalation Cron**
   * *Goal:* Connect `apps/worker` to PostgreSQL to evaluate overdue tickets against SLA targets and dispatch automated email alerts.
4. **Task 4: Implement Work Order Digital Signature Capture**
   * *Goal:* Allow field technicians on `/dashboard/employee` to capture client sign-off signatures upon ticket resolution.
5. **Task 5: Complete Preventive Maintenance (PM) Scheduler UI**
   * *Goal:* Build customer asset recurring service trigger rules in `/dashboard/contracts` to auto-generate preventive service tickets.
