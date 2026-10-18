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

-- 8. Enable RLS and Policies for Core Business Entities
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_customers ON customers;
CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_service_tickets ON service_tickets;
CREATE POLICY tenant_isolation_service_tickets ON service_tickets
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_work_orders ON work_orders;
CREATE POLICY tenant_isolation_work_orders ON work_orders
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_products ON products;
CREATE POLICY tenant_isolation_products ON products
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_departments ON departments;
CREATE POLICY tenant_isolation_departments ON departments
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_notifications ON notifications;
CREATE POLICY tenant_isolation_notifications ON notifications
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_subscriptions ON subscriptions;
CREATE POLICY tenant_isolation_subscriptions ON subscriptions
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_payment_transactions ON payment_transactions;
CREATE POLICY tenant_isolation_payment_transactions ON payment_transactions
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE customer_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_customer_branches ON customer_branches;
CREATE POLICY tenant_isolation_customer_branches ON customer_branches
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_customer_contacts ON customer_contacts;
CREATE POLICY tenant_isolation_customer_contacts ON customer_contacts
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE customer_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_customer_users ON customer_users;
CREATE POLICY tenant_isolation_customer_users ON customer_users
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

-- 9. Enable RLS and Policies for Remaining Tenant-Owned & Association Tables
ALTER TABLE customer_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_customer_assets ON customer_assets;
CREATE POLICY tenant_isolation_customer_assets ON customer_assets
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_employee_profiles ON employee_profiles;
CREATE POLICY tenant_isolation_employee_profiles ON employee_profiles
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE ticket_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_ticket_timeline ON ticket_timeline;
CREATE POLICY tenant_isolation_ticket_timeline ON ticket_timeline
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE ticket_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_ticket_assignments ON ticket_assignments;
CREATE POLICY tenant_isolation_ticket_assignments ON ticket_assignments
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE work_order_checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_work_order_checklist_items ON work_order_checklist_items;
CREATE POLICY tenant_isolation_work_order_checklist_items ON work_order_checklist_items
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_spare_parts ON spare_parts;
CREATE POLICY tenant_isolation_spare_parts ON spare_parts
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_storage_locations ON storage_locations;
CREATE POLICY tenant_isolation_storage_locations ON storage_locations
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE part_inventories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_part_inventories ON part_inventories;
CREATE POLICY tenant_isolation_part_inventories ON part_inventories
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_inventory_transactions ON inventory_transactions;
CREATE POLICY tenant_isolation_inventory_transactions ON inventory_transactions
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE ticket_part_consumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_ticket_part_consumptions ON ticket_part_consumptions;
CREATE POLICY tenant_isolation_ticket_part_consumptions ON ticket_part_consumptions
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE tenant_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_tenant_policies ON tenant_policies;
CREATE POLICY tenant_isolation_tenant_policies ON tenant_policies
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE service_catalogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_service_catalogs ON service_catalogs;
CREATE POLICY tenant_isolation_service_catalogs ON service_catalogs
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE service_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_service_contracts ON service_contracts;
CREATE POLICY tenant_isolation_service_contracts ON service_contracts
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

ALTER TABLE preventive_maintenance_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_pm_schedules ON preventive_maintenance_schedules;
CREATE POLICY tenant_isolation_pm_schedules ON preventive_maintenance_schedules
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

-- Association table: contract_assets (joins via service_contracts)
ALTER TABLE contract_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_contract_assets ON contract_assets;
CREATE POLICY tenant_isolation_contract_assets ON contract_assets
    FOR ALL
    USING (
        is_rls_bypassed() = true
        OR EXISTS (
            SELECT 1 FROM service_contracts sc
            WHERE sc.id = contract_assets.contract_id
            AND sc.tenant_id = current_tenant_id()
        )
    )
    WITH CHECK (
        is_rls_bypassed() = true
        OR EXISTS (
            SELECT 1 FROM service_contracts sc
            WHERE sc.id = contract_assets.contract_id
            AND sc.tenant_id = current_tenant_id()
        )
    );

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_invitations ON invitations;
CREATE POLICY tenant_isolation_invitations ON invitations
    FOR ALL
    USING (is_rls_bypassed() = true OR tenant_id = current_tenant_id())
    WITH CHECK (is_rls_bypassed() = true OR tenant_id = current_tenant_id());

-- 10. Enforce FORCE ROW LEVEL SECURITY across all tenant-scoped tables
-- This ensures PostgreSQL enforces RLS even when connecting as the database role that owns the tables
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE email_configurations FORCE ROW LEVEL SECURITY;
ALTER TABLE inbound_emails FORCE ROW LEVEL SECURITY;
ALTER TABLE email_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE email_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE support_emails FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE service_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE work_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE departments FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_branches FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_users FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket_timeline FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE work_order_checklist_items FORCE ROW LEVEL SECURITY;
ALTER TABLE spare_parts FORCE ROW LEVEL SECURITY;
ALTER TABLE storage_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE part_inventories FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket_part_consumptions FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE service_catalogs FORCE ROW LEVEL SECURITY;
ALTER TABLE service_contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE preventive_maintenance_schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE contract_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;



