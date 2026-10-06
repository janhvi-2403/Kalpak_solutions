-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('SERVICE', 'PRODUCT', 'BOTH');

-- CreateEnum
CREATE TYPE "PurposeOfUse" AS ENUM ('INTERNAL', 'EXTERNAL', 'BOTH');

-- CreateEnum
CREATE TYPE "AssignmentStrategy" AS ENUM ('MANUAL_DEPT_HEAD', 'AUTO_SKILLS', 'AUTO_ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "ClosureAuthority" AS ENUM ('SUPPORT_EMPLOYEE', 'CLIENT', 'ADMIN', 'DEPT_HEAD', 'ANYONE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'BOTH', 'NONE');

-- CreateEnum
CREATE TYPE "PlatformAccess" AS ENUM ('WEB', 'MOBILE', 'BOTH');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketRaisedBy" AS ENUM ('CUSTOMER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "TicketEventType" AS ENUM ('CREATED', 'ASSIGNED', 'REASSIGNED', 'STATUS_CHANGED', 'NOTE_ADDED', 'PRIORITY_CHANGED', 'CLOSED', 'REOPENED', 'OVERDUE_FLAGGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TICKET_CREATED', 'TICKET_ASSIGNED', 'STATUS_CHANGED', 'NOTE_ADDED', 'SLA_BREACH', 'TICKET_RESOLVED', 'TICKET_CLOSED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('PURCHASE_RECEIPT', 'WORK_ORDER_CONSUMPTION', 'TICKET_CONSUMPTION', 'MANUAL_ADJUSTMENT', 'TRANSFER', 'RETURN');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('COMPREHENSIVE', 'NON_COMPREHENSIVE', 'LABOR_ONLY');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PmFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'BI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL', 'PAST_DUE', 'PENDING_PAYMENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InboundForwardingStatus" AS ENUM ('WAITING_FOR_SETUP', 'CONNECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboundEmailStatus" AS ENUM ('NOT_CONFIGURED', 'CONNECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "EmailProcessingStatus" AS ENUM ('PROCESSED', 'PENDING', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "SupportEmailVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'UNVERIFIED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone_number" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),
    "mfa_backup_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role_id" UUID NOT NULL,
    "department" VARCHAR(100),
    "token_hash" VARCHAR(64) NOT NULL,
    "invited_by_user_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "full_name" VARCHAR(150),
    "phone" VARCHAR(30),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "active_tenant_id" UUID,
    "session_token_hash" VARCHAR(64) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "mfa_verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "actor_id" UUID,
    "event_type" VARCHAR(80) NOT NULL,
    "resource_type" VARCHAR(80) NOT NULL,
    "resource_id" VARCHAR(64),
    "action" VARCHAR(80) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "business_type" "BusinessType" NOT NULL DEFAULT 'BOTH',
    "purpose_of_use" "PurposeOfUse" NOT NULL DEFAULT 'BOTH',
    "allow_customer_to_raise" BOOLEAN NOT NULL DEFAULT true,
    "allow_employee_on_behalf" BOOLEAN NOT NULL DEFAULT true,
    "assignment_strategy" "AssignmentStrategy" NOT NULL DEFAULT 'MANUAL_DEPT_HEAD',
    "closure_authority" "ClosureAuthority" NOT NULL DEFAULT 'SUPPORT_EMPLOYEE',
    "tolerable_open_days" INTEGER NOT NULL DEFAULT 3,
    "notification_channels" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "platform_access" "PlatformAccess" NOT NULL DEFAULT 'BOTH',
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "max_users_quota" INTEGER NOT NULL DEFAULT 25,
    "subscription_starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription_ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "head_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "poc_name" VARCHAR(100),
    "poc_email" VARCHAR(255),
    "poc_phone" VARCHAR(30),
    "poc_user_id" UUID,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "contact_person" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "pincode" VARCHAR(20),
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "portal_access_enabled" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "department_id" UUID,
    "name" VARCHAR(150) NOT NULL,
    "model_number" VARCHAR(100) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "has_warranty" BOOLEAN NOT NULL DEFAULT true,
    "warranty_period_months" INTEGER NOT NULL DEFAULT 12,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_catalogs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL,
    "installation_date" TIMESTAMPTZ(6),
    "warranty_end_date" TIMESTAMPTZ(6),
    "location" VARCHAR(150),
    "status" VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "customer_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "department_id" UUID,
    "designation" VARCHAR(100),
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phone" VARCHAR(30),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "active_tickets_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_number" VARCHAR(30) NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "raised_by" "TicketRaisedBy" NOT NULL DEFAULT 'EMPLOYEE',
    "raised_by_user_id" UUID,
    "raised_for_customer_id" UUID,
    "assigned_to_user_id" UUID,
    "department_id" UUID,
    "customer_asset_id" UUID,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "tolerable_open_days" INTEGER NOT NULL DEFAULT 5,
    "due_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "contract_id" UUID,
    "pm_schedule_id" UUID,
    "service_type" VARCHAR(50) NOT NULL DEFAULT 'BREAKDOWN',
    "closed_by_user_id" UUID,
    "closure_remarks" TEXT,
    "product_id" UUID,
    "service_catalog_id" UUID,
    "source" VARCHAR(30) NOT NULL DEFAULT 'PORTAL',

    CONSTRAINT "service_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_timeline" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "event_type" "TicketEventType" NOT NULL,
    "actor_user_id" UUID,
    "previous_status" "TicketStatus",
    "new_status" "TicketStatus",
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "assigned_to_user_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "department_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMPTZ(6),

    CONSTRAINT "ticket_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationDeliveryChannel" NOT NULL DEFAULT 'IN_APP',
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(500),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_number" VARCHAR(30) NOT NULL,
    "ticket_id" UUID NOT NULL,
    "assigned_technician_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "customer_asset_id" UUID,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "service_type" VARCHAR(50) NOT NULL DEFAULT 'ON_SITE_REPAIR',
    "scheduled_date" TIMESTAMPTZ(6) NOT NULL,
    "work_started_at" TIMESTAMPTZ(6),
    "work_completed_at" TIMESTAMPTZ(6),
    "technician_notes" TEXT,
    "resolution_summary" TEXT,
    "customer_signer_name" VARCHAR(150),
    "customer_signer_title" VARCHAR(100),
    "customer_signature" TEXT,
    "customer_rating" INTEGER,
    "customer_feedback" TEXT,
    "is_signed" BOOLEAN NOT NULL DEFAULT false,
    "signed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_checklist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "item_code" VARCHAR(50) NOT NULL,
    "task_title" VARCHAR(250) NOT NULL,
    "description" TEXT,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "reading_value" VARCHAR(100),
    "target_value" VARCHAR(100),
    "remarks" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "verified_by_user_id" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spare_parts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "part_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(80) NOT NULL,
    "unit_of_measure" VARCHAR(20) NOT NULL DEFAULT 'PIECE',
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost_price" DECIMAL(12,2),
    "min_stock_alert" INTEGER NOT NULL DEFAULT 5,
    "compatible_models" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'WAREHOUSE',
    "address" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_inventories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "part_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
    "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
    "bin_location" VARCHAR(50),
    "last_restocked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "part_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "transaction_type" "InventoryTransactionType" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "unit_cost" DECIMAL(12,2),
    "reference_type" VARCHAR(50),
    "reference_id" VARCHAR(64),
    "performed_by_user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_part_consumptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "work_order_id" UUID,
    "part_id" UUID NOT NULL,
    "location_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_warranty_covered" BOOLEAN NOT NULL DEFAULT false,
    "consumed_by_user_id" UUID,
    "consumed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_part_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "contract_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "contract_type" "ContractType" NOT NULL DEFAULT 'COMPREHENSIVE',
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "billing_frequency" VARCHAR(30) NOT NULL DEFAULT 'ANNUAL',
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventive_maintenance_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID,
    "asset_id" UUID NOT NULL,
    "department_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "frequency" "PmFrequency" NOT NULL DEFAULT 'QUARTERLY',
    "next_due_date" TIMESTAMPTZ(6) NOT NULL,
    "last_serviced_date" TIMESTAMPTZ(6),
    "total_visits_quota" INTEGER NOT NULL DEFAULT 4,
    "visits_completed_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "preventive_maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_bootstrap" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "super_admin_id" UUID,
    "initialized_ip" VARCHAR(45),
    "bootstrap_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_bootstrap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plan" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'ANNUAL',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "gateway_order_id" VARCHAR(100),
    "gateway_payment_id" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "order_id" VARCHAR(100) NOT NULL,
    "payment_id" VARCHAR(100),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "payment_method" VARCHAR(50),
    "plan" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'ANNUAL',
    "signature" VARCHAR(255),
    "error_message" TEXT,
    "raw_gateway_response" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" VARCHAR(100) NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(30) NOT NULL DEFAULT 'PROCESSED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_configurations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "support_email" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'GMAIL',
    "provider_address" VARCHAR(255),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "auto_create_ticket" BOOLEAN NOT NULL DEFAULT true,
    "auto_route" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "verification_token" VARCHAR(100),
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_replies_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_department_id" UUID,
    "default_priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "notify_customer_reply" BOOLEAN NOT NULL DEFAULT true,
    "notify_long_open_ticket" BOOLEAN NOT NULL DEFAULT true,
    "notify_ticket_assigned" BOOLEAN NOT NULL DEFAULT true,
    "notify_ticket_closed" BOOLEAN NOT NULL DEFAULT true,
    "notify_ticket_created" BOOLEAN NOT NULL DEFAULT true,
    "notify_ticket_resolved" BOOLEAN NOT NULL DEFAULT true,
    "notify_ticket_status_changed" BOOLEAN NOT NULL DEFAULT true,
    "unknown_customer_policy" VARCHAR(50) NOT NULL DEFAULT 'AUTO_CREATE',
    "forwarding_method" VARCHAR(50) NOT NULL DEFAULT 'EMAIL_FORWARDING',
    "forwarding_status" "InboundForwardingStatus" NOT NULL DEFAULT 'WAITING_FOR_SETUP',
    "inbound_address" VARCHAR(255),
    "last_tested_at" TIMESTAMPTZ(6),
    "last_tested_message" VARCHAR(500),
    "from_email" VARCHAR(255),
    "last_outbound_tested_at" TIMESTAMPTZ(6),
    "last_outbound_tested_message" VARCHAR(500),
    "outbound_status" "OutboundEmailStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "reply_to_email" VARCHAR(255),
    "sender_name" VARCHAR(150),

    CONSTRAINT "email_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'GMAIL',
    "email_address" VARCHAR(255) NOT NULL,
    "encrypted_token_data" TEXT NOT NULL,
    "status" "EmailConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_history_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'GMAIL',
    "provider_message_id" VARCHAR(255) NOT NULL,
    "message_id" VARCHAR(255),
    "in_reply_to" VARCHAR(255),
    "references" TEXT,
    "from_email" VARCHAR(255) NOT NULL,
    "to_email" VARCHAR(255) NOT NULL,
    "cc_email" VARCHAR(255),
    "subject" VARCHAR(500) NOT NULL,
    "body_text" TEXT,
    "body_html" TEXT,
    "direction" "EmailDirection" NOT NULL DEFAULT 'INBOUND',
    "processing_status" "EmailProcessingStatus" NOT NULL DEFAULT 'PROCESSED',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID,
    "provider" VARCHAR(50) NOT NULL,
    "provider_event_id" VARCHAR(255),
    "message_id" VARCHAR(255) NOT NULL,
    "from_email" VARCHAR(255) NOT NULL,
    "from_name" VARCHAR(150),
    "to_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "body_text" TEXT NOT NULL,
    "body_html" TEXT,
    "in_reply_to" VARCHAR(255),
    "thread_id" VARCHAR(255),
    "raw_payload" JSONB NOT NULL DEFAULT '{}',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "verification_status" "SupportEmailVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "idx_tenants_status" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "idx_tenants_deleted_at" ON "tenants"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_is_active" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "idx_users_deleted_at" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_memberships_tenant_id" ON "tenant_memberships"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_memberships_user_id" ON "tenant_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key" ON "tenant_memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_roles_tenant_id" ON "roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_email_tokens_hash" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_email_tokens_user_id" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_reset_tokens_hash" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_reset_tokens_user_id" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "idx_invitations_token_hash" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "idx_invitations_tenant_id" ON "invitations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_invitations_email" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "idx_permissions_module" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_hash_key" ON "sessions"("session_token_hash");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_active_tenant_id" ON "sessions"("active_tenant_id");

-- CreateIndex
CREATE INDEX "idx_sessions_expires_at" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_sessions_revoked_at" ON "sessions"("revoked_at");

-- CreateIndex
CREATE INDEX "idx_audit_events_tenant_id" ON "audit_events"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_audit_events_actor_id" ON "audit_events"("actor_id");

-- CreateIndex
CREATE INDEX "idx_audit_events_event_type" ON "audit_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_audit_events_created_at" ON "audit_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_policies_tenant_id_key" ON "tenant_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_departments_tenant_id" ON "departments"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_departments_deleted_at" ON "departments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_code_key" ON "departments"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE INDEX "idx_customers_tenant_id" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_customers_email" ON "customers"("email");

-- CreateIndex
CREATE INDEX "idx_customers_phone" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "idx_customers_status" ON "customers"("status");

-- CreateIndex
CREATE INDEX "idx_customers_deleted_at" ON "customers"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_products_tenant_id" ON "products"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_products_category" ON "products"("category");

-- CreateIndex
CREATE INDEX "idx_products_deleted_at" ON "products"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_model_number_key" ON "products"("tenant_id", "model_number");

-- CreateIndex
CREATE INDEX "idx_service_catalog_tenant_id" ON "service_catalogs"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_service_catalog_deleted_at" ON "service_catalogs"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_catalogs_tenant_id_code_key" ON "service_catalogs"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "idx_assets_tenant_id" ON "customer_assets"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_assets_customer_id" ON "customer_assets"("customer_id");

-- CreateIndex
CREATE INDEX "idx_assets_product_id" ON "customer_assets"("product_id");

-- CreateIndex
CREATE INDEX "idx_assets_status" ON "customer_assets"("status");

-- CreateIndex
CREATE INDEX "idx_assets_deleted_at" ON "customer_assets"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_assets_tenant_id_serial_number_key" ON "customer_assets"("tenant_id", "serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_user_id_key" ON "employee_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_employees_tenant_id" ON "employee_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_employees_department_id" ON "employee_profiles"("department_id");

-- CreateIndex
CREATE INDEX "idx_employees_is_available" ON "employee_profiles"("is_available");

-- CreateIndex
CREATE INDEX "idx_tickets_tenant_id" ON "service_tickets"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tickets_status" ON "service_tickets"("status");

-- CreateIndex
CREATE INDEX "idx_tickets_priority" ON "service_tickets"("priority");

-- CreateIndex
CREATE INDEX "idx_tickets_assigned_to" ON "service_tickets"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "idx_tickets_department_id" ON "service_tickets"("department_id");

-- CreateIndex
CREATE INDEX "idx_tickets_customer_id" ON "service_tickets"("raised_for_customer_id");

-- CreateIndex
CREATE INDEX "idx_tickets_contract_id" ON "service_tickets"("contract_id");

-- CreateIndex
CREATE INDEX "idx_tickets_pm_schedule_id" ON "service_tickets"("pm_schedule_id");

-- CreateIndex
CREATE INDEX "idx_tickets_is_overdue" ON "service_tickets"("is_overdue");

-- CreateIndex
CREATE INDEX "idx_tickets_created_at" ON "service_tickets"("created_at");

-- CreateIndex
CREATE INDEX "idx_tickets_deleted_at" ON "service_tickets"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_tickets_tenant_id_ticket_number_key" ON "service_tickets"("tenant_id", "ticket_number");

-- CreateIndex
CREATE INDEX "idx_timeline_ticket_id" ON "ticket_timeline"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_timeline_tenant_id" ON "ticket_timeline"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_timeline_event_type" ON "ticket_timeline"("event_type");

-- CreateIndex
CREATE INDEX "idx_timeline_created_at" ON "ticket_timeline"("created_at");

-- CreateIndex
CREATE INDEX "idx_assignments_ticket_id" ON "ticket_assignments"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_assignments_tenant_id" ON "ticket_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_assignments_assigned_to" ON "ticket_assignments"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "idx_assignments_is_active" ON "ticket_assignments"("is_active");

-- CreateIndex
CREATE INDEX "idx_notifications_user_read" ON "notifications"("tenant_id", "user_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_work_orders_tenant_id" ON "work_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_work_orders_ticket_id" ON "work_orders"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_work_orders_technician_id" ON "work_orders"("assigned_technician_id");

-- CreateIndex
CREATE INDEX "idx_work_orders_customer_id" ON "work_orders"("customer_id");

-- CreateIndex
CREATE INDEX "idx_work_orders_status" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "idx_work_orders_scheduled_date" ON "work_orders"("scheduled_date");

-- CreateIndex
CREATE INDEX "idx_work_orders_deleted_at" ON "work_orders"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_tenant_id_order_number_key" ON "work_orders"("tenant_id", "order_number");

-- CreateIndex
CREATE INDEX "idx_checklist_tenant_id" ON "work_order_checklist_items"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_checklist_work_order_id" ON "work_order_checklist_items"("work_order_id");

-- CreateIndex
CREATE INDEX "idx_checklist_status" ON "work_order_checklist_items"("status");

-- CreateIndex
CREATE INDEX "idx_spare_parts_tenant_id" ON "spare_parts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_spare_parts_category" ON "spare_parts"("category");

-- CreateIndex
CREATE INDEX "idx_spare_parts_is_active" ON "spare_parts"("is_active");

-- CreateIndex
CREATE INDEX "idx_spare_parts_deleted_at" ON "spare_parts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "spare_parts_tenant_id_part_number_key" ON "spare_parts"("tenant_id", "part_number");

-- CreateIndex
CREATE INDEX "idx_locations_tenant_id" ON "storage_locations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_locations_type" ON "storage_locations"("type");

-- CreateIndex
CREATE UNIQUE INDEX "storage_locations_tenant_id_code_key" ON "storage_locations"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "idx_part_inventory_tenant_id" ON "part_inventories"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_part_inventory_part_id" ON "part_inventories"("part_id");

-- CreateIndex
CREATE INDEX "idx_part_inventory_location_id" ON "part_inventories"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_inventories_tenant_id_part_id_location_id_key" ON "part_inventories"("tenant_id", "part_id", "location_id");

-- CreateIndex
CREATE INDEX "idx_inv_trans_tenant_id" ON "inventory_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_inv_trans_part_id" ON "inventory_transactions"("part_id");

-- CreateIndex
CREATE INDEX "idx_inv_trans_location_id" ON "inventory_transactions"("location_id");

-- CreateIndex
CREATE INDEX "idx_inv_trans_type" ON "inventory_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "idx_inv_trans_created_at" ON "inventory_transactions"("created_at");

-- CreateIndex
CREATE INDEX "idx_part_consumption_tenant_id" ON "ticket_part_consumptions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_part_consumption_ticket_id" ON "ticket_part_consumptions"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_part_consumption_work_order_id" ON "ticket_part_consumptions"("work_order_id");

-- CreateIndex
CREATE INDEX "idx_part_consumption_part_id" ON "ticket_part_consumptions"("part_id");

-- CreateIndex
CREATE INDEX "idx_contracts_tenant_id" ON "service_contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_contracts_customer_id" ON "service_contracts"("customer_id");

-- CreateIndex
CREATE INDEX "idx_contracts_status" ON "service_contracts"("status");

-- CreateIndex
CREATE INDEX "idx_contracts_end_date" ON "service_contracts"("end_date");

-- CreateIndex
CREATE INDEX "idx_contracts_deleted_at" ON "service_contracts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_contracts_tenant_id_contract_number_key" ON "service_contracts"("tenant_id", "contract_number");

-- CreateIndex
CREATE INDEX "idx_contract_assets_contract_id" ON "contract_assets"("contract_id");

-- CreateIndex
CREATE INDEX "idx_contract_assets_asset_id" ON "contract_assets"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_assets_contract_id_asset_id_key" ON "contract_assets"("contract_id", "asset_id");

-- CreateIndex
CREATE INDEX "idx_pm_schedules_tenant_id" ON "preventive_maintenance_schedules"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_pm_schedules_contract_id" ON "preventive_maintenance_schedules"("contract_id");

-- CreateIndex
CREATE INDEX "idx_pm_schedules_asset_id" ON "preventive_maintenance_schedules"("asset_id");

-- CreateIndex
CREATE INDEX "idx_pm_schedules_next_due_date" ON "preventive_maintenance_schedules"("next_due_date");

-- CreateIndex
CREATE INDEX "idx_pm_schedules_is_active" ON "preventive_maintenance_schedules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "system_bootstrap_super_admin_id_key" ON "system_bootstrap"("super_admin_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_tenant_id" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_subscriptions_ends_at" ON "subscriptions"("ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_order_id_key" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_payment_id_key" ON "payment_transactions"("payment_id");

-- CreateIndex
CREATE INDEX "idx_payments_tenant_id" ON "payment_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_payments_user_id" ON "payment_transactions"("user_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "idx_payments_order_id" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "idx_webhook_events_event_id" ON "webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "idx_webhook_events_created_at" ON "webhook_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_configurations_tenant_id_key" ON "email_configurations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_email_configs_tenant_id" ON "email_configurations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_email_configs_support_email" ON "email_configurations"("support_email");

-- CreateIndex
CREATE INDEX "idx_email_configs_provider_address" ON "email_configurations"("provider_address");

-- CreateIndex
CREATE UNIQUE INDEX "email_connections_tenant_id_key" ON "email_connections"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_email_connections_tenant_id" ON "email_connections"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_email_connections_email_address" ON "email_connections"("email_address");

-- CreateIndex
CREATE INDEX "idx_email_connections_status" ON "email_connections"("status");

-- CreateIndex
CREATE INDEX "idx_email_messages_tenant_id" ON "email_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_email_messages_ticket_id" ON "email_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_email_messages_provider_msg_id" ON "email_messages"("provider_message_id");

-- CreateIndex
CREATE INDEX "idx_email_messages_message_id" ON "email_messages"("message_id");

-- CreateIndex
CREATE INDEX "idx_email_messages_from_email" ON "email_messages"("from_email");

-- CreateIndex
CREATE INDEX "idx_email_messages_to_email" ON "email_messages"("to_email");

-- CreateIndex
CREATE INDEX "idx_email_messages_direction" ON "email_messages"("direction");

-- CreateIndex
CREATE INDEX "idx_email_messages_processing_status" ON "email_messages"("processing_status");

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_tenant_id_provider_message_id_key" ON "email_messages"("tenant_id", "provider_message_id");

-- CreateIndex
CREATE INDEX "idx_inbound_emails_tenant_id" ON "inbound_emails"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_inbound_emails_ticket_id" ON "inbound_emails"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_inbound_emails_message_id" ON "inbound_emails"("message_id");

-- CreateIndex
CREATE INDEX "idx_inbound_emails_provider_event_id" ON "inbound_emails"("provider_event_id");

-- CreateIndex
CREATE INDEX "idx_inbound_emails_from_email" ON "inbound_emails"("from_email");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_emails_tenant_id_message_id_key" ON "inbound_emails"("tenant_id", "message_id");

-- CreateIndex
CREATE INDEX "idx_support_emails_tenant_id" ON "support_emails"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_support_emails_email" ON "support_emails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "support_emails_tenant_id_email_key" ON "support_emails"("tenant_id", "email");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_tenant_id_fkey" FOREIGN KEY ("active_tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_policies" ADD CONSTRAINT "tenant_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_poc_user_id_fkey" FOREIGN KEY ("poc_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_catalogs" ADD CONSTRAINT "service_catalogs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_assets" ADD CONSTRAINT "customer_assets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_assets" ADD CONSTRAINT "customer_assets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_assets" ADD CONSTRAINT "customer_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "service_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_customer_asset_id_fkey" FOREIGN KEY ("customer_asset_id") REFERENCES "customer_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_pm_schedule_id_fkey" FOREIGN KEY ("pm_schedule_id") REFERENCES "preventive_maintenance_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_raised_by_user_id_fkey" FOREIGN KEY ("raised_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_raised_for_customer_id_fkey" FOREIGN KEY ("raised_for_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_service_catalog_id_fkey" FOREIGN KEY ("service_catalog_id") REFERENCES "service_catalogs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_timeline" ADD CONSTRAINT "ticket_timeline_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_timeline" ADD CONSTRAINT "ticket_timeline_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_timeline" ADD CONSTRAINT "ticket_timeline_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_technician_id_fkey" FOREIGN KEY ("assigned_technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_asset_id_fkey" FOREIGN KEY ("customer_asset_id") REFERENCES "customer_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_checklist_items" ADD CONSTRAINT "work_order_checklist_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_checklist_items" ADD CONSTRAINT "work_order_checklist_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_parts" ADD CONSTRAINT "spare_parts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_inventories" ADD CONSTRAINT "part_inventories_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "storage_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_inventories" ADD CONSTRAINT "part_inventories_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "spare_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_inventories" ADD CONSTRAINT "part_inventories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "storage_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_part_consumptions" ADD CONSTRAINT "ticket_part_consumptions_consumed_by_user_id_fkey" FOREIGN KEY ("consumed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_part_consumptions" ADD CONSTRAINT "ticket_part_consumptions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_part_consumptions" ADD CONSTRAINT "ticket_part_consumptions_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_part_consumptions" ADD CONSTRAINT "ticket_part_consumptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_part_consumptions" ADD CONSTRAINT "ticket_part_consumptions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_part_consumptions" ADD CONSTRAINT "ticket_part_consumptions_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_assets" ADD CONSTRAINT "contract_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "customer_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_assets" ADD CONSTRAINT "contract_assets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "service_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "customer_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "service_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_schedules" ADD CONSTRAINT "preventive_maintenance_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_bootstrap" ADD CONSTRAINT "system_bootstrap_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_configurations" ADD CONSTRAINT "email_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_emails" ADD CONSTRAINT "support_emails_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==============================================================================
-- Kalpak Solutions SaaS Platform - PostgreSQL Row Level Security (RLS) Baseline
-- ==============================================================================

-- 1. Helper function: Get current tenant ID from connection session context
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Helper function: Check if current session has RLS bypass flag set (e.g., Super Admin)
CREATE OR REPLACE FUNCTION is_rls_bypassed() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(NULLIF(current_setting('app.bypass_rls', true), '')::BOOLEAN, false);
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Enable RLS on Tenant-Scoped Tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for 'roles'
-- Can view system roles (tenant_id IS NULL) or roles belonging to active tenant, or if bypassed
DROP POLICY IF EXISTS roles_tenant_isolation_policy ON roles;
CREATE POLICY roles_tenant_isolation_policy ON roles
    FOR ALL
    USING (
        is_rls_bypassed() = true
        OR tenant_id IS NULL
        OR tenant_id = current_tenant_id()
    )
    WITH CHECK (
        is_rls_bypassed() = true
        OR (tenant_id IS NOT NULL AND tenant_id = current_tenant_id())
    );

-- 5. Create Policies for 'tenant_memberships'
DROP POLICY IF EXISTS tenant_memberships_isolation_policy ON tenant_memberships;
CREATE POLICY tenant_memberships_isolation_policy ON tenant_memberships
    FOR ALL
    USING (
        is_rls_bypassed() = true
        OR tenant_id = current_tenant_id()
    )
    WITH CHECK (
        is_rls_bypassed() = true
        OR tenant_id = current_tenant_id()
    );

-- 6. Create Policies for 'audit_events'
DROP POLICY IF EXISTS audit_events_isolation_policy ON audit_events;
CREATE POLICY audit_events_isolation_policy ON audit_events
    FOR ALL
    USING (
        is_rls_bypassed() = true
        OR tenant_id = current_tenant_id()
    )
    WITH CHECK (
        is_rls_bypassed() = true
        OR tenant_id = current_tenant_id()
    );

-- 7. Enable RLS and Policies for Email Tables
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_email_configurations ON email_configurations;
CREATE POLICY tenant_isolation_email_configurations ON email_configurations
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_inbound_emails ON inbound_emails;
CREATE POLICY tenant_isolation_inbound_emails ON inbound_emails
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_email_connections ON email_connections;
CREATE POLICY tenant_isolation_email_connections ON email_connections
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_email_messages ON email_messages;
CREATE POLICY tenant_isolation_email_messages ON email_messages
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE support_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_support_emails ON support_emails;
CREATE POLICY tenant_isolation_support_emails ON support_emails
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());


