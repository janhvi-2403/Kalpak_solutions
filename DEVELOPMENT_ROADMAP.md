# Kalpak Solutions — Service Calls & Ticket Management System
## Prioritized Development Roadmap & Implementation Plan

**Document ID:** KALPAK-PLAN-004  
**Version:** 1.0.0  
**Date:** October 2026  
**Status:** Engineering Execution Roadmap  

---

## 1. Overview & Prioritization Strategy

This roadmap outlines the systematic, step-by-step engineering plan to transition the Kalpak Solutions SaaS platform from its current evaluation state into a production-hardened industrial release.

Work is organized into **six sequential phases** based on dependency topology, operational stability, and customer-facing business value:

```
+-----------------------------------------------------------------------------------+
|                           PHASED EXECUTION PIPELINE                               |
+-----------------------------------------------------------------------------------+
|  Phase 1: Critical Bugs & Deployment Stability       (Immediate / Days 1 - 3)     |
|  Phase 2: Core Workflows & Role Permissions Enhancements (Days 4 - 8)             |
|  Phase 3: Background Automation & SLA Worker          (Days 9 - 14)               |
|  Phase 4: Integrations & Multi-Channel Ingestion      (Days 15 - 20)              |
|  Phase 5: Enterprise Security & E2E Testing           (Days 21 - 25)              |
|  Phase 6: Production Launch & Operational Runbooks    (Days 26 - 30)              |
+-----------------------------------------------------------------------------------+
```

---

## 2. Phase-by-Phase Implementation Plan

### Phase 1: Critical Bugs & Deployment Stability
**Goal:** Eliminate all existing test failures, stabilize Render cloud deployment, and eradicate cold-start latency.

#### Task 1.1: Fix Payments Service Unit Test & Strict Plan Enum Validation
* **Priority:** P0 (Highest)
* **Dependencies:** None
* **Affected Files:** [`apps/api/src/modules/payments/payments.service.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/payments/payments.service.ts), [`apps/api/test/payments.service.spec.ts`](file:///c:/Kalpak_proj/apps/api/test/payments.service.spec.ts)
* **Implementation Approach:** In `PaymentsService.createOrder`, validate the input `plan` against allowed `PlanTier` enum values (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`). If the value does not match, immediately throw `new BadRequestException('Invalid subscription plan specified')` instead of falling back to default values.
* **Acceptance Criteria:** `pnpm --filter @kalpak/api run test -- test/payments.service.spec.ts` passes with 0 failures.
* **Verification Steps:** Run Jest test runner and verify that `should reject order creation if the plan is invalid` passes.

#### Task 1.2: Mock Google OAuth Network Calls in Gmail Integration Tests
* **Priority:** P0
* **Dependencies:** None
* **Affected Files:** [`apps/api/test/gmail-email-integration.spec.ts`](file:///c:/Kalpak_proj/apps/api/test/gmail-email-integration.spec.ts)
* **Implementation Approach:** Use Jest `jest.spyOn` or `nock` to intercept outgoing HTTPS requests to `https://oauth2.googleapis.com` and `https://gmail.googleapis.com`. Return mocked JSON responses rather than attempting real external network calls that time out after 5000ms.
* **Acceptance Criteria:** `pnpm --filter @kalpak/api run test -- test/gmail-email-integration.spec.ts` completes in under 3 seconds with 0 failures.
* **Verification Steps:** Run test suite and confirm that all 71 tests in `@kalpak/api` pass.

#### Task 1.3: Resolve Render Production Host Resolution & DNS Mapping
* **Priority:** P0
* **Dependencies:** Render Dashboard Access
* **Affected Files:** [`render.yaml`](file:///c:/Kalpak_proj/render.yaml), [`apps/web/next.config.ts`](file:///c:/Kalpak_proj/apps/web/next.config.ts)
* **Implementation Approach:** Check the Render dashboard for the exact service slug assigned to the backend web service (e.g., `kalpak-api` vs. `kalpak-backend`). Update `render.yaml` and frontend environment variable `API_BASE_URL` to match the exact live URL.
* **Acceptance Criteria:** `curl -I https://<actual-backend-url>/health` returns HTTP 200 OK.
* **Verification Steps:** Execute curl from local terminal and test full login on `kalpak-web.onrender.com`.

---

### Phase 2: Core Workflows & Role Permissions Enhancements
**Goal:** Complete field technician signoff and customer feedback workflows.

#### Task 2.1: Field Technician Work Order Digital Signature Capture
* **Priority:** P1
* **Dependencies:** Task 1.1
* **Affected Files:** [`apps/web/src/app/dashboard/employee/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/dashboard/employee/page.tsx), [`apps/api/src/modules/work-orders/work-orders.service.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/work-orders/work-orders.service.ts)
* **Implementation Approach:** Add an HTML5 canvas signature pad component in the field technician console. Upon marking a work order completed, capture the base64 SVG/PNG customer signature and store it in `work_orders.customer_signature`.
* **Acceptance Criteria:** Completed work orders display customer signature and timestamp on the ticket timeline.
* **Verification Steps:** Log in as `tech@acme.com`, complete a work order with signature, and verify record in PostgreSQL.

#### Task 2.2: Customer Portal Resolution Rating & Feedback Loop
* **Priority:** P1
* **Dependencies:** Task 2.1
* **Affected Files:** [`apps/web/src/app/portal/[tenantSlug]/tickets/[id]/page.tsx`](file:///c:/Kalpak_proj/apps/web/src/app/portal), [`apps/api/src/modules/tickets/tickets.controller.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/tickets/tickets.controller.ts)
* **Implementation Approach:** Create endpoint `POST /api/v1/tickets/:id/feedback` accepting a 1-to-5 star rating and optional comments when a ticket reaches `RESOLVED` status.
* **Acceptance Criteria:** Customer ratings appear on the Client Admin dashboard and contribute to average technician performance scores.
* **Verification Steps:** Submit rating from customer portal and verify calculation in `/dashboard/reports`.

---

### Phase 3: Background Automation & SLA Worker
**Goal:** Implement automated ticket escalations and recurring preventive maintenance.

#### Task 3.1: SLA Escalation Background Job
* **Priority:** P1
* **Dependencies:** Phase 1
* **Affected Files:** [`apps/worker/src/sla-escalation.worker.ts`](file:///c:/Kalpak_proj/apps/worker), [`apps/api/src/modules/tickets/tickets.service.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/tickets/tickets.service.ts)
* **Implementation Approach:** Implement a recurring cron job running every 15 minutes that queries `service_tickets` where `status IN ('OPEN', 'ASSIGNED')` and `created_at < now() - INTERVAL '48 hours'`. Flag ticket as `is_sla_breached = true` and dispatch email notification to the Department Head.
* **Acceptance Criteria:** Overdue tickets automatically receive an SLA breach badge on the dashboard.
* **Verification Steps:** Insert test ticket with backdated timestamp and verify automated escalation trigger.

#### Task 3.2: Automated Preventive Maintenance (PM) Ticket Generator
* **Priority:** P2
* **Dependencies:** Task 3.1
* **Affected Files:** [`apps/worker/src/pm-scheduler.worker.ts`](file:///c:/Kalpak_proj/apps/worker), [`packages/database/prisma/schema.prisma`](file:///c:/Kalpak_proj/packages/database/prisma/schema.prisma)
* **Implementation Approach:** Implement a daily cron job inspecting `preventive_maintenance_schedules` where `next_due_date <= CURRENT_DATE`. Automatically instantiate a new `ServiceTicket` linked to the customer asset with type `PREVENTIVE_MAINTENANCE`.
* **Acceptance Criteria:** Service tickets are automatically generated 7 days prior to machine maintenance due date.
* **Verification Steps:** Run PM worker script manually and confirm ticket creation in PostgreSQL database.

---

### Phase 4: Integrations & Multi-Channel Ingestion
**Goal:** Productionize multi-channel email and messaging pipelines.

#### Task 4.1: CloudMailin Production Webhook Verification
* **Priority:** P1
* **Dependencies:** Phase 1
* **Affected Files:** [`apps/api/src/modules/email-integration/cloudmailin-webhook.controller.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/email-integration/cloudmailin-webhook.controller.ts)
* **Implementation Approach:** Add HTTP Basic Authentication and HMAC secret verification to the CloudMailin endpoint. Test multipart email attachments (PDF breakdown reports, machine photos) and attach them to tickets.
* **Acceptance Criteria:** Emails sent to `support@acme.kalpaksolutions.com` create tickets with photo attachments.
* **Verification Steps:** Send test email using curl multipart payload and verify file attachment in ticket timeline.

#### Task 4.2: Outbound WhatsApp Ticket Notification Webhook Adapter
* **Priority:** P2
* **Dependencies:** Task 3.1
* **Affected Files:** [`apps/api/src/modules/notifications/adapters/`](file:///c:/Kalpak_proj/apps/api/src/modules/notifications)
* **Implementation Approach:** Implement `WhatsAppNotificationAdapter` implementing `NotificationProvider` using the Meta Cloud API or Twilio API to send instant WhatsApp alerts to technicians when high-priority tickets are assigned.
* **Acceptance Criteria:** Technicians receive WhatsApp message with ticket number, customer name, and 1-click link to work order.
* **Verification Steps:** Send mock WhatsApp payload and verify dispatch logs.

---

### Phase 5: Enterprise Security & E2E Testing
**Goal:** Comprehensive test coverage and penetration resistance.

#### Task 5.1: End-to-End Playwright Browser Automation Suite
* **Priority:** P1
* **Dependencies:** Phases 1 & 2
* **Affected Files:** `tests/e2e/*`, `playwright.config.ts`
* **Implementation Approach:** Build automated browser tests simulating complete user journeys:
  1. Client Admin registers company and invites technician.
  2. Technician accepts invite and sets password.
  3. Customer logs into portal and raises breakdown ticket.
  4. Client Admin assigns ticket to technician.
  5. Technician completes work order and resolves ticket.
* **Acceptance Criteria:** Full 5-step lifecycle passes in headless Chromium on GitHub Actions CI.
* **Verification Steps:** Run `pnpm test:e2e` in CI pipeline.

#### Task 5.2: Redis Session Cache Layer for Horizontal Scaling
* **Priority:** P2
* **Dependencies:** Phase 1
* **Affected Files:** [`packages/auth/src/sessions.ts`](file:///c:/Kalpak_proj/packages/auth), [`apps/api/src/modules/auth/auth.service.ts`](file:///c:/Kalpak_proj/apps/api/src/modules/auth/auth.service.ts)
* **Implementation Approach:** Introduce a Redis cache layer in front of the PostgreSQL `sessions` table. Read session verification tokens from Redis (sub-millisecond latency) and fall back to PostgreSQL on cache miss.
* **Acceptance Criteria:** API throughput increases to >1,500 req/sec under Apache Bench load testing.
* **Verification Steps:** Execute load test and verify 99% session cache hit ratio in Redis.

---

### Phase 6: Production Launch & Operational Runbooks
**Goal:** Final staging signoff, custom domain SSL, and operator training.

#### Task 6.1: Custom Domain SSL & Wildcard Subdomain Routing
* **Priority:** P1
* **Dependencies:** Phase 1
* **Affected Files:** Cloudflare / DNS Manager, Render Custom Domains
* **Implementation Approach:** Configure `*.kalpaksolutions.com` wildcard DNS CNAME pointing to Render. Enable automatic Let's Encrypt wildcard SSL certificates.
* **Acceptance Criteria:** Any registered tenant slug (`acme.kalpaksolutions.com`) automatically routes to the client portal with valid SSL.
* **Verification Steps:** Test subdomain resolution via browser and verify SSL certificate chain.

#### Task 6.2: System Operator Runbook & Backup Verification
* **Priority:** P2
* **Dependencies:** All previous tasks
* **Affected Files:** `docs/runbooks/disaster-recovery.md`
* **Implementation Approach:** Document automated daily PostgreSQL backup procedures, point-in-time recovery (PITR) procedures, and incident response playbooks for database failover.
* **Acceptance Criteria:** Successful restoration of a test database from backup snapshot in under 15 minutes.
* **Verification Steps:** Execute mock disaster recovery exercise on local PostgreSQL instance.

---

## 3. The First Five Development Tasks to Execute Next

To achieve immediate stability and unblock user evaluations, developers must execute the following five tasks in exact priority order:

```
================================================================================
FIRST 5 DEVELOPMENT TASKS (EXECUTE IN ORDER)
================================================================================
1. [P0] Task 1.1: Fix Payments Service Unit Test & Strict Plan Enum Validation
   Target File: apps/api/src/modules/payments/payments.service.ts
   Action: Throw BadRequestException on invalid plan tier.

2. [P0] Task 1.2: Mock Google OAuth Network Calls in Gmail Integration Tests
   Target File: apps/api/test/gmail-email-integration.spec.ts
   Action: Eliminate 5000ms network timeout by stubbing OAuth tokens.

3. [P0] Task 1.3: Resolve Render Production Host Resolution & DNS Mapping
   Target File: render.yaml & Render Cloud Dashboard
   Action: Ensure https://kalpak-api.onrender.com resolves and responds with HTTP 200.

4. [P1] Task 2.1: Implement Field Technician Work Order Digital Signature Capture
   Target File: apps/web/src/app/dashboard/employee/page.tsx
   Action: Add HTML5 signature pad canvas on work order completion.

5. [P1] Task 3.1: Activate Background SLA Escalation Cron Job in apps/worker
   Target File: apps/worker/src/sla-escalation.worker.ts
   Action: Add periodic evaluation of overdue tickets against SLA targets.
================================================================================
```
