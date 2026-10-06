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


